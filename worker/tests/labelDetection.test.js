const { getLabels } = require('../src/services/labelDetection');

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

describe('getLabels', () => {
  const sampleBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock_openai_key';
  });

  it('returns mapped labels from OpenAI response', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: '[{"description":"Cat","score":0.98},{"description":"Animal","score":0.95}]',
        },
      }],
    });

    const result = await getLabels(sampleBuffer);
    expect(result).toEqual([
      { description: 'Cat', score: 0.98 },
      { description: 'Animal', score: 0.95 },
    ]);
  });

  it('returns empty array when OpenAI content has no match', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'No labels found' } }],
    });

    const result = await getLabels(sampleBuffer);
    expect(result).toEqual([]);
  });

  it('handles invalid JSON gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '[invalid json]' } }],
    });

    const result = await getLabels(sampleBuffer);
    expect(result).toEqual([]);
  });

  it('propagates OpenAI API errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('OpenAI API rate limit'));
    await expect(getLabels(sampleBuffer)).rejects.toThrow('OpenAI API rate limit');
  });
});