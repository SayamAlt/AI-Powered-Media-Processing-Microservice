const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/services/storage', () => ({
  uploadFile: jest.fn().mockResolvedValue('uploads/test-image.png'),
}));
jest.mock('../src/services/queue', () => ({
  enqueueJob: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/models/Job', () => ({
  create: jest.fn().mockResolvedValue({
    _id: 'job123',
    status: 'pending',
  }),
}));

describe('Upload Endpoint API Testing', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    authToken = jwt.sign({ sub: 'user123' }, process.env.JWT_ACCESS_SECRET);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no image file is attached', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No image file provided' });
  });

  it('accepts valid PNG image upload and returns 201 with jobId', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from([0x89, 0x50, 0x4E, 0x47]), 'test.png');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ jobId: 'job123', status: 'pending' });
  });
});
