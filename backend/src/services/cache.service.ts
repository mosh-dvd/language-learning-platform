import { getRedisClient } from '../db/redis.js';
import type { Lesson } from '../models/lesson.model.js';
import type { Exercise } from '../models/exercise.model.js';

export class CacheService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly DAILY_REVIEW_PREFIX = 'daily_review:';
  private readonly LESSON_PREFIX = 'lesson:';
  private readonly SRS_PREFIX = 'srs:';

  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly TOKEN_BLACKLIST_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly DAILY_REVIEW_TTL = 24 * 60 * 60; // 24 hours
  private readonly LESSON_TTL = 60 * 60; // 1 hour
  private readonly SRS_TTL = 60 * 60; // 1 hour

  // Session Management
  async setSession(userId: string, sessionData: any): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.SESSION_PREFIX}${userId}`;
    await client.setEx(key, this.SESSION_TTL, JSON.stringify(sessionData));
  }

  async getSession(userId: string): Promise<any | null> {
    const client = await getRedisClient();
    const key = `${this.SESSION_PREFIX}${userId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.SESSION_PREFIX}${userId}`;
    await client.del(key);
  }

  // JWT Token Blacklist
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    await client.setEx(key, expiresIn, '1');
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const client = await getRedisClient();
    const key = `${this.TOKEN_BLACKLIST_PREFIX}${token}`;
    const result = await client.get(key);
    return result !== null;
  }

  // Daily Review Queue
  async setDailyReview(userId: string, exercises: Exercise[]): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.DAILY_REVIEW_PREFIX}${userId}`;
    await client.setEx(key, this.DAILY_REVIEW_TTL, JSON.stringify(exercises));
  }

  async getDailyReview(userId: string): Promise<Exercise[] | null> {
    const client = await getRedisClient();
    const key = `${this.DAILY_REVIEW_PREFIX}${userId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateDailyReview(userId: string): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.DAILY_REVIEW_PREFIX}${userId}`;
    await client.del(key);
  }

  // Lesson Data
  async setLesson(lessonId: string, lesson: Lesson): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.LESSON_PREFIX}${lessonId}`;
    await client.setEx(key, this.LESSON_TTL, JSON.stringify(lesson));
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    const client = await getRedisClient();
    const key = `${this.LESSON_PREFIX}${lessonId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateLesson(lessonId: string): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.LESSON_PREFIX}${lessonId}`;
    await client.del(key);
  }

  async invalidateLessonsByLanguage(languageCode: string): Promise<void> {
    const client = await getRedisClient();
    const pattern = `${this.LESSON_PREFIX}*`;
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      // Filter lessons by language (requires fetching and checking)
      const pipeline = client.multi();
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const lesson = JSON.parse(data) as Lesson;
          if (lesson.targetLanguage === languageCode) {
            pipeline.del(key);
          }
        }
      }
      await pipeline.exec();
    }
  }

  // SRS Calculation Results
  async setSRSResult(userId: string, wordId: string, result: any): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.SRS_PREFIX}${userId}:${wordId}`;
    await client.setEx(key, this.SRS_TTL, JSON.stringify(result));
  }

  async getSRSResult(userId: string, wordId: string): Promise<any | null> {
    const client = await getRedisClient();
    const key = `${this.SRS_PREFIX}${userId}:${wordId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateSRSResult(userId: string, wordId: string): Promise<void> {
    const client = await getRedisClient();
    const key = `${this.SRS_PREFIX}${userId}:${wordId}`;
    await client.del(key);
  }

  async invalidateAllSRSForUser(userId: string): Promise<void> {
    const client = await getRedisClient();
    const pattern = `${this.SRS_PREFIX}${userId}:*`;
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  // Generic cache operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = await getRedisClient();
    if (ttl) {
      await client.setEx(key, ttl, JSON.stringify(value));
    } else {
      await client.set(key, JSON.stringify(value));
    }
  }

  async get(key: string): Promise<any | null> {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  }

  async flushAll(): Promise<void> {
    const client = await getRedisClient();
    await client.flushAll();
  }
}

export const cacheService = new CacheService();
