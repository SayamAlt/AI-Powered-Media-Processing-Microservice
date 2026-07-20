const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const Job = require('../src/models/Job');

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/services/storage', () => ({
  getImageUrl: jest.fn(path => `http://localhost:9000/${path}`),
}));
jest.mock('../src/services/queue', () => ({
  enqueueJob: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/models/Job');

describe('Jobs Endpoints API Testing', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    authToken = jwt.sign({ sub: 'user123' }, process.env.JWT_ACCESS_SECRET);
  });

  describe('GET /api/jobs', () => {
    it('returns 401 when unauthorized', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(401);
    });

    it('returns job list for authenticated user', async () => {
      const mockJobs = [{ _id: 'job1', storagePath: 'uploads/test1.jpg' }];
      Job.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockJobs),
      });
      Job.countDocuments.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.jobs[0].imageUrl).toContain('uploads/test1.jpg');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('returns 404 when job not found', async () => {
      Job.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/api/jobs/invalid123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Job not found' });
    });
  });

  describe('POST /api/jobs/:id/retry', () => {
    it('rejects retrying non-failed jobs with 400', async () => {
      Job.findOne.mockResolvedValue({
        _id: 'job123',
        status: 'completed',
        userId: 'user123',
      });

      const res = await request(app)
        .post('/api/jobs/job123/retry')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Only failed jobs can be retried' });
    });
  });
});
