const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const Notification = require('../src/models/Notification');

jest.mock('../src/config/db', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/models/Notification');

describe('Notifications Endpoints API Testing', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    authToken = jwt.sign({ sub: 'user123' }, process.env.JWT_ACCESS_SECRET);
  });

  it('GET /api/notifications returns list and unread count', async () => {
    Notification.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'notif1', message: 'Test flag' }]),
    });
    Notification.countDocuments.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.notifications).toHaveLength(1);
  });

  it('PUT /api/notifications/read-all marks all notifications read', async () => {
    Notification.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'All notifications marked as read' });
  });
});
