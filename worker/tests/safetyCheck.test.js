const { checkSafety } = require('../src/services/safetyCheck');

const mockModerationsCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    moderations: {
      create: mockModerationsCreate,
    },
  }));
});

describe('checkSafety', () => {
  const sampleBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'mock_openai_key';
  });

  it('returns flagged false for safe content', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{
        category_scores: {
          sexual: 0.01,
          harassment: 0.01,
          'self-harm': 0.01,
          violence: 0.01,
        },
      }],
    });

    const result = await checkSafety(sampleBuffer);
    expect(result.flagged).toBe(false);
    expect(result.flaggedCategories).toEqual([]);
    expect(result.safetyResult.adult).toBe('VERY_UNLIKELY');
  });

  it('flags LIKELY adult content (score >= 0.5)', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{
        category_scores: {
          sexual: 0.6,
          harassment: 0.01,
          'self-harm': 0.01,
          violence: 0.01,
        },
      }],
    });

    const result = await checkSafety(sampleBuffer);
    expect(result.flagged).toBe(true);
    expect(result.flaggedCategories).toContain('adult');
    expect(result.flaggedCategories).toContain('racy');
  });

  it('flags VERY_LIKELY violence (score >= 0.8)', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{
        category_scores: {
          sexual: 0.01,
          harassment: 0.01,
          'self-harm': 0.01,
          violence: 0.85,
        },
      }],
    });

    const result = await checkSafety(sampleBuffer);
    expect(result.flagged).toBe(true);
    expect(result.flaggedCategories).toContain('violence');
  });

  it('does not flag POSSIBLE level content (score < 0.5)', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{
        category_scores: {
          sexual: 0.3,
          harassment: 0.3,
          'self-harm': 0.3,
          violence: 0.3,
        },
      }],
    });

    const result = await checkSafety(sampleBuffer);
    expect(result.flagged).toBe(false);
    expect(result.safetyResult.adult).toBe('POSSIBLE');
  });

  it('returns safety result object with all required categories', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{
        category_scores: {},
      }],
    });

    const result = await checkSafety(sampleBuffer);
    expect(result.safetyResult).toHaveProperty('adult');
    expect(result.safetyResult).toHaveProperty('spoof');
    expect(result.safetyResult).toHaveProperty('medical');
    expect(result.safetyResult).toHaveProperty('violence');
    expect(result.safetyResult).toHaveProperty('racy');
  });
});