const Redis = require('ioredis-mock');
const createRateLimiter = require('../middlewares/tokenBucketLimiter');

describe('Rate Limiter Middleware', () => {
  let mockRedis;
  let rateLimiter;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRedis = new Redis();
    rateLimiter = createRateLimiter({
      redis: mockRedis,
      defaultBucketSize: 10,
      defaultRefillRate: 2,
      failOpen: false
    });
    mockReq = {
      headers: {
        'x-api-key': 'test-key'
      },
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(async () => {
    await mockRedis.flushall();
    await mockRedis.quit();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await mockRedis.disconnect();
  });

  test('should allow request when tokens are available', async () => {
    const now = Date.now();
    await mockRedis.hmset('ratelimit:test-key', {
      tokens: '5',
      lastRefill: now.toString(),
      bucketSize: '10',
      refillRate: '2'
    });

    await rateLimiter(mockReq, mockRes, mockNext);

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
  });

  test('should reject request when no tokens are available', async () => {
    // Create a spy on the middleware that simulates rate limit rejection
    const limiterSpy = jest.spyOn(require('../middlewares/tokenBucketLimiter').TokenBucketLimiter.prototype, 'isAllowed')
      .mockResolvedValue({
        allowed: false,
        retryAfter: 10,
        remaining: 0
      });

    await rateLimiter(mockReq, mockRes, mockNext);

    expect(limiterSpy).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Too Many Requests',
      retryAfter: expect.any(Number)
    });
  });

  test('should handle Redis errors gracefully', async () => {
    mockRedis.hgetall = jest.fn().mockRejectedValue(new Error('Redis error'));

    await rateLimiter(mockReq, mockRes, mockNext);

    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should use IP as fallback when no API key', async () => {
    delete mockReq.headers['x-api-key'];
    
    const now = Date.now();
    await mockRedis.hmset('ratelimit:127.0.0.1', {
      tokens: '5',
      lastRefill: now.toString(),
      bucketSize: '10',
      refillRate: '2'
    });

    await rateLimiter(mockReq, mockRes, mockNext);

    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
  });
});
