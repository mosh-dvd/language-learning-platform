import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { cacheService } from './cache.service.js';
import { getRedisClient, closeRedisClient } from '../db/redis.js';

describe('CacheService', () => {
  beforeAll(async () => {
    // Ensure Redis is connected
    await getRedisClient();
  });

  afterAll(async () => {
    // Clean up
    await closeRedisClient();
  });

  beforeEach(async () => {
    // Clear all cache before each test
    await cacheService.flushAll();
  });

  describe('Session Management', () => {
    it('should set and get session data', async () => {
      const userId = 'user-123';
      const sessionData = { name: 'Test User', email: 'test@example.com' };

      await cacheService.setSession(userId, sessionData);
      const retrieved = await cacheService.getSession(userId);

      expect(retrieved).toEqual(sessionData);
    });

    it('should delete session data', async () => {
      const userId = 'user-123';
      const sessionData = { name: 'Test User' };

      await cacheService.setSession(userId, sessionData);
      await cacheService.deleteSession(userId);
      const retrieved = await cacheService.getSession(userId);

      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await cacheService.getSession('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Token Blacklist', () => {
    it('should blacklist a token', async () => {
      const token = 'test-token-123';
      const ttl = 3600;

      await cacheService.blacklistToken(token, ttl);
      const isBlacklisted = await cacheService.isTokenBlacklisted(token);

      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted = await cacheService.isTokenBlacklisted('non-existent-token');
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('Daily Review', () => {
    it('should cache and retrieve daily review', async () => {
      const userId = 'user-123';
      const exercises = [
        { id: 'ex-1', lessonId: 'lesson-1', imageId: 'img-1', exerciseType: 'image_text' as const, orderIndex: 0, createdAt: new Date() },
        { id: 'ex-2', lessonId: 'lesson-1', imageId: 'img-2', exerciseType: 'image_text' as const, orderIndex: 1, createdAt: new Date() },
      ];

      await cacheService.setDailyReview(userId, exercises);
      const retrieved = await cacheService.getDailyReview(userId);

      expect(retrieved).toHaveLength(2);
      expect(retrieved?.[0].id).toBe('ex-1');
    });

    it('should invalidate daily review', async () => {
      const userId = 'user-123';
      const exercises = [
        { id: 'ex-1', lessonId: 'lesson-1', imageId: 'img-1', exerciseType: 'image_text' as const, orderIndex: 0, createdAt: new Date() },
      ];

      await cacheService.setDailyReview(userId, exercises);
      await cacheService.invalidateDailyReview(userId);
      const retrieved = await cacheService.getDailyReview(userId);

      expect(retrieved).toBeNull();
    });
  });

  describe('Lesson Caching', () => {
    it('should cache and retrieve lesson', async () => {
      const lessonId = 'lesson-123';
      const lesson = {
        id: lessonId,
        title: 'Test Lesson',
        targetLanguage: 'es',
        published: true,
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      await cacheService.setLesson(lessonId, lesson);
      const retrieved = await cacheService.getLesson(lessonId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Lesson');
    });

    it('should invalidate lesson cache', async () => {
      const lessonId = 'lesson-123';
      const lesson = {
        id: lessonId,
        title: 'Test Lesson',
        targetLanguage: 'es',
        published: true,
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      await cacheService.setLesson(lessonId, lesson);
      await cacheService.invalidateLesson(lessonId);
      const retrieved = await cacheService.getLesson(lessonId);

      expect(retrieved).toBeNull();
    });
  });

  describe('SRS Results', () => {
    it('should cache and retrieve SRS result', async () => {
      const userId = 'user-123';
      const wordId = 'word-456';
      const result = {
        nextReview: new Date(),
        interval: 3,
        easeFactor: 2.5,
      };

      await cacheService.setSRSResult(userId, wordId, result);
      const retrieved = await cacheService.getSRSResult(userId, wordId);

      expect(retrieved).toBeDefined();
      expect(retrieved.interval).toBe(3);
    });

    it('should invalidate SRS result', async () => {
      const userId = 'user-123';
      const wordId = 'word-456';
      const result = { interval: 3 };

      await cacheService.setSRSResult(userId, wordId, result);
      await cacheService.invalidateSRSResult(userId, wordId);
      const retrieved = await cacheService.getSRSResult(userId, wordId);

      expect(retrieved).toBeNull();
    });

    it('should invalidate all SRS results for user', async () => {
      const userId = 'user-123';
      
      await cacheService.setSRSResult(userId, 'word-1', { interval: 1 });
      await cacheService.setSRSResult(userId, 'word-2', { interval: 2 });
      await cacheService.setSRSResult(userId, 'word-3', { interval: 3 });

      await cacheService.invalidateAllSRSForUser(userId);

      const result1 = await cacheService.getSRSResult(userId, 'word-1');
      const result2 = await cacheService.getSRSResult(userId, 'word-2');
      const result3 = await cacheService.getSRSResult(userId, 'word-3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe('Generic Operations', () => {
    it('should set and get generic values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should check if key exists', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheService.set(key, value);
      const exists = await cacheService.exists(key);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cacheService.exists('non-existent-key');
      expect(exists).toBe(false);
    });

    it('should delete a key', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheService.set(key, value);
      await cacheService.delete(key);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toBeNull();
    });
  });
});
