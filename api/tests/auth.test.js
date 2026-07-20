const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/models/User');

describe('Auth Endpoints API Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  });

  describe('POST /api/auth/signup', () => {
    it('creates a new user and returns access token', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toEqual({ id: 'user123', email: 'test@example.com' });
    });

    it('rejects signup with missing email or password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Email and password required' });
    });

    it('rejects short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Password must be at least 8 characters' });
    });

    it('returns 409 if email is already registered', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing123' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Email already registered' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('rejects login when user does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns 401 when no refresh token cookie is present', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'No refresh token' });
    });
  });
});
