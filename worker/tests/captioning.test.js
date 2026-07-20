const { getCaption } = require('../src/services/captioning');

const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

global.fetch = jest.fn();

describe('getCaption', () => {
  const sampleBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HF_API_KEY = 'mock_hf_key';
    process.env.OPENAI_API_KEY = 'mock_openai_key';
  });

  it('returns HuggingFace caption when HF inference succeeds', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue([{ generated_text: 'A cat sitting on a chair' }]),
    });

    const result = await getCaption(sampleBuffer);
    expect(result).toBe('A cat sitting on a chair');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://router.huggingface.co/hf-inference/models/Salesforce/blip-image-captioning-base',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock_hf_key',
        }),
      })
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('falls back to OpenAI when HF inference fails (non-ok response)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'A dog running in the park' } }],
    });

    const result = await getCaption(sampleBuffer);
    expect(result).toBe('A dog running in the park');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('falls back to OpenAI when HF fetch throws an error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'A beautiful sunset' } }],
    });

    const result = await getCaption(sampleBuffer);
    expect(result).toBe('A beautiful sunset');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('throws error when OpenAI returns empty content', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '' } }],
    });

    await expect(getCaption(sampleBuffer)).rejects.toThrow('No caption returned from OpenAI');
  });
});
