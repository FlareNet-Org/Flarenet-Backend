const Redis = require('ioredis-mock');
const createRateLimiter = require('../middlewares/tokenBucketLimiter');
const { TokenBucketLimiter } = require('../middlewares/tokenBucketLimiter');

describe('Enhanced Rate Limiter Tests', () => {
  let mockRedis;
  let limiter;
  let middleware;
  
  beforeEach(() => {
    // Create a fresh Redis mock for each test
    mockRedis = new Redis();
    
    // Create both the limiter instance and middleware
    limiter = new TokenBucketLimiter({
      redis: mockRedis,
      defaultBucketSize: 10,
      defaultRefillRate: 1,
      keyPrefix: 'test:',
      keyExpiry: 60
    });
    
    middleware = createRateLimiter({
      redis: mockRedis,
      defaultBucketSize: 10,
      defaultRefillRate: 1,
      keyPrefix: 'test:',
      keyExpiry: 60
    });
  });
  
  afterEach(async () => {
    await mockRedis.flushall();
  });
  
  describe('Core Token Bucket Algorithm', () => {
    test('should create a new bucket when none exists', async () => {
      const bucket = await limiter.getBucket('user1', 10, 1);
      
      expect(bucket).toHaveProperty('tokens');
      expect(bucket).toHaveProperty('lastRefill');
      expect(bucket).toHaveProperty('bucketSize');
      expect(bucket).toHaveProperty('refillRate');
      expect(bucket.tokens).toBe(10);
      expect(bucket.bucketSize).toBe(10);
      expect(bucket.refillRate).toBe(1);
    });
    
    test('should consume tokens correctly', async () => {
      // First request should be allowed and consume 1 token
      const result1 = await limiter.isAllowed('user1', 10, 1);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(9);
      
      // Second request should also be allowed
      const result2 = await limiter.isAllowed('user1', 10, 1);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(8);
    });
    
    test('should refill tokens based on time passed', async () => {
      // Initial request
      const result1 = await limiter.isAllowed('user1', 10, 1);
      expect(result1.remaining).toBe(9);
      
      // Mock time passing (2 seconds = 2 tokens refilled)
      const now = Date.now();
      const twoPrevious = now - 2000;
      
      // Manually set last refill time to 2 seconds ago
      await mockRedis.hmset('test:user1', {
        tokens: '8',
        lastRefill: twoPrevious.toString(),
        bucketSize: '10',
        refillRate: '1'
      });
      
      // Next request should see refilled tokens
      const result2 = await limiter.isAllowed('user1', 10, 1);
      expect(result2.remaining).toBe(9); // 8 + 2 refilled - 1 consumed
    });
    
    test('should reject when no tokens available', async () => {
      // Set up a bucket with 0 tokens
      await mockRedis.hmset('test:user1', {
        tokens: '0',
        lastRefill: Date.now().toString(),
        bucketSize: '10',
        refillRate: '0.1' // Slow refill rate
      });
      
      const result = await limiter.isAllowed('user1', 10, 0.1);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
    
    test('should not exceed bucket size when refilling', async () => {
      // Set bucket with tokens at max and last refill long ago
      const longAgo = Date.now() - 3600000; // 1 hour ago
      await mockRedis.hmset('test:user1', {
        tokens: '10',
        lastRefill: longAgo.toString(),
        bucketSize: '10',
        refillRate: '1'
      });
      
      // Even with long time passed, tokens should stay at bucketSize
      const result = await limiter.isAllowed('user1', 10, 1);
      expect(result.remaining).toBe(9); // Max 10 - 1 consumed
    });
  });
  
  describe('Express Middleware Functionality', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    
    beforeEach(() => {
      mockReq = {
        ip: '127.0.0.1',
        headers: {},
        body: {}
      };
      
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };
      
      mockNext = jest.fn();
    });
    
    test('should call next() when request is allowed', async () => {
      await middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    test('should set rate limit headers', async () => {
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(Number));
    });
    
    test('should return 429 when rate limited', async () => {
      // Set up Redis to simulate rate limit exceeded
      await mockRedis.hmset('test:127.0.0.1', {
        tokens: '0',
        lastRefill: Date.now().toString(),
        bucketSize: '10',
        refillRate: '0.1'
      });
      
      await middleware(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too Many Requests'
      }));
      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });
    
    test('should use custom key generator if provided', async () => {
      const customMiddleware = createRateLimiter({
        redis: mockRedis,
        keyGenerator: (req) => 'custom-key'
      });
      
      await customMiddleware(mockReq, mockRes, mockNext);
      
      // Verify a bucket was created with the custom key
      const bucket = await mockRedis.hgetall('ratelimit:custom-key');
      expect(bucket).toBeTruthy();
    });
    
    test('should use different limits based on plan', async () => {
      const planLimiterMiddleware = createRateLimiter({
        redis: mockRedis,
        planLimiter: (req) => {
          if (req.body.plan === 'pro') {
            return { bucketSize: 20, refillRate: 2 };
          }
          return { bucketSize: 5, refillRate: 0.5 };
        }
      });
      
      // Test with free plan
      mockReq.body.plan = 'free';
      await planLimiterMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      
      // Reset mocks
      mockRes.set.mockClear();
      mockNext.mockClear();
      
      // Test with pro plan
      mockReq.body.plan = 'pro';
      await planLimiterMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', 20);
    });
  });
});
