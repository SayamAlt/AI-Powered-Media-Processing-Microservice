jest.mock('../src/services/storage');
jest.mock('../src/services/captioning');
jest.mock('../src/services/labelDetection');
jest.mock('../src/services/safetyCheck');
jest.mock('../src/models/Job', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../src/models/Notification', () => ({
  create: jest.fn(),
}));

const { processMedia } = require('../src/processors/mediaProcessor');
const { downloadFile } = require('../src/services/storage');
const { getCaption } = require('../src/services/captioning');
const { getLabels } = require('../src/services/labelDetection');
const { checkSafety } = require('../src/services/safetyCheck');
const Job = require('../src/models/Job');
const Notification = require('../src/models/Notification');

const safeSafetyResult = {
  safetyResult: { adult: 'VERY_UNLIKELY', spoof: 'VERY_UNLIKELY', medical: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'VERY_UNLIKELY' },
  flagged: false,
  flaggedCategories: [],
};

const JOB_DATA = { jobId: 'job123', storagePath: 'uploads/test.jpg', userId: 'user123' };

describe('processMedia', () => {
  beforeEach(() => {
    Job.findById.mockResolvedValue({ _id: 'job123' });
    Job.findByIdAndUpdate.mockResolvedValue({});
    Notification.create.mockResolvedValue({});
    downloadFile.mockResolvedValue(Buffer.from('fake-image'));
    getCaption.mockResolvedValue('a test image');
    getLabels.mockResolvedValue([{ description: 'Test', score: 0.9 }]);
    checkSafety.mockResolvedValue(safeSafetyResult);
  });

  it('runs full pipeline and marks job completed', async () => {
    await processMedia(JOB_DATA);
    expect(downloadFile).toHaveBeenCalledWith('uploads/test.jpg', 'job123');
    expect(getCaption).toHaveBeenCalledWith(expect.any(Buffer));
    expect(getLabels).toHaveBeenCalledWith(expect.any(Buffer));
    expect(checkSafety).toHaveBeenCalledWith(expect.any(Buffer));
    expect(Job.findByIdAndUpdate).toHaveBeenCalledWith('job123', expect.objectContaining({
      status: 'completed',
      caption: 'a test image',
    }));
  });

  it('creates in-app notification when content is flagged', async () => {
    checkSafety.mockResolvedValue({
      safetyResult: { adult: 'VERY_LIKELY', spoof: 'VERY_UNLIKELY', medical: 'VERY_UNLIKELY', violence: 'UNLIKELY', racy: 'UNLIKELY' },
      flagged: true,
      flaggedCategories: ['adult'],
    });
    await processMedia(JOB_DATA);
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user123',
      jobId: 'job123',
      message: expect.stringContaining('adult'),
    }));
  });

  it('does not create notification for safe content', async () => {
    await processMedia(JOB_DATA);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('throws when job not found', async () => {
    Job.findById.mockResolvedValue(null);
    await expect(processMedia(JOB_DATA)).rejects.toThrow('Job job123 not found');
  });

  it('propagates captioning errors so BullMQ can retry', async () => {
    getCaption.mockRejectedValue(new Error('HF API timeout'));
    await expect(processMedia(JOB_DATA)).rejects.toThrow('HF API timeout');
  });

  it('propagates label detection errors for retry', async () => {
    getLabels.mockRejectedValue(new Error('GCV quota exceeded'));
    await expect(processMedia(JOB_DATA)).rejects.toThrow('GCV quota exceeded');
  });

  it('runs steps sequentially: caption then labels then safety', async () => {
    const order = [];
    getCaption.mockImplementation(async () => { order.push('caption'); return 'test'; });
    getLabels.mockImplementation(async () => { order.push('labels'); return []; });
    checkSafety.mockImplementation(async () => { order.push('safety'); return safeSafetyResult; });
    await processMedia(JOB_DATA);
    expect(order).toEqual(['caption', 'labels', 'safety']);
  });

  it('marks job processing before running AI steps', async () => {
    const callOrder = [];
    Job.findByIdAndUpdate.mockImplementation(async (_id, update) => {
      callOrder.push(update.status || 'no-status');
      return {};
    });
    getCaption.mockImplementation(async () => { callOrder.push('caption-call'); return 'test'; });
    await processMedia(JOB_DATA);
    expect(callOrder[0]).toBe('processing');
  });
});