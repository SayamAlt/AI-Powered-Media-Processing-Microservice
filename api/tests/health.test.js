const request = require('supertest');
const app = require('../src/index');

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}));

describe('Health Check Endpoint API Testing', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
