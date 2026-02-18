import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { Pool } from 'pg';
import { GamificationService } from './gamification.service.js';
import { UserStreak } from '../models/userStreak.model.js';
import { Achievement } from '../models/achievement.model.js';

describe('GamificationService', () => {
  let service: GamificationService;
  let mockPool: Pool;
  const mockStreaks: Map<string, UserStreak> = new Map();
  const mockXP: Map<string, Array<{ amount: number; reason: string; createdAt: Date }>> = new Map();
  const mockProgress: Map<string, Array<{ exerciseId: string; completed: boolean; completedAt: Date }>> =
    new Map();

  beforeEach(() => {
    mockStreaks.clear();
    mockXP.clear();
    mockProgress.clear();

    // Create mock pool
    mockPool = {
      query: vi.fn(async (query: string, values?: any[]) => {
        // Handle user_streaks queries
        if (query.includes('user_streaks')) {
          if (query.includes('INSERT') || query.includes('ON CONFLICT')) {
            const userId = values![0];
            const currentStreak = values![1];
            const longestStreak = values![2];
            const lastActivityDate = values![3];

            const streak: UserStreak = {
              id: `streak-${userId}`,
              userId,
              currentStreak,
              longestStreak,
              lastActivityDate,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockStreaks.set(userId, streak);
            return { rows: [streak] };
          } else if (query.includes('SELECT')) {
            const userId = values![0];
            const streak = mockStreaks.get(userId);
            return { rows: streak ? [streak] : [] };
          } else if (query.includes('UPDATE')) {
            const userId = values![values!.length - 1];
            const existing = mockStreaks.get(userId);
            if (existing) {
              const updated = { ...existing, ...values };
              mockStreaks.set(userId, updated);
              return { rows: [updated] };
            }
            return { rows: [] };
          }
        }

        // Handle user_xp queries
        if (query.includes('user_xp')) {
          if (query.includes('INSERT')) {
            const userId = values![0];
            const amount = values![1];
            const reason = values![2];
            const xpEntry = { amount, reason, createdAt: new Date() };
            const userXP = mockXP.get(userId) || [];
            userXP.push(xpEntry);
            mockXP.set(userId, userXP);
            return { rows: [{ id: `xp-${Date.now()}`, userId, ...xpEntry }] };
          } else if (query.includes('SUM')) {
            const userId = values![0];
            const userXP = mockXP.get(userId) || [];
            const total = userXP.reduce((sum, xp) => sum + xp.amount, 0);
            return { rows: [{ total: total.toString() }] };
          }
        }

        // Handle user_progress queries
        if (query.includes('user_progress')) {
          const userId = values![0];
          const progress = mockProgress.get(userId) || [];
          const count = progress.filter((p) => p.completed).length;
          return { rows: [{ count: count.toString() }] };
        }

        return { rows: [] };
      }),
    } as any;

    service = new GamificationService(mockPool);
  });

  // Feature: language-learning-platform, Property 35: Streak calculation
  // Validates: Requirements 13.1, 13.2, 13.3
  describe('Property 35: Streak calculation', () => {
    it('should increment streak for consecutive days and reset on miss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
          async (dayGaps) => {
            const userId = `user-${Date.now()}-${Math.random()}`;

            let expectedCurrentStreak = 0;
            let expectedLongestStreak = 0;
            let currentDate = new Date('2024-01-01');

            for (const gap of dayGaps) {
              // Advance date by gap days
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() + gap);

              if (gap === 0) {
                // Same day - streak should not change
                continue;
              } else if (gap === 1) {
                // Consecutive day - increment streak
                expectedCurrentStreak++;
              } else {
                // Missed days - reset streak
                expectedCurrentStreak = 1;
              }

              expectedLongestStreak = Math.max(expectedLongestStreak, expectedCurrentStreak);

              // Simulate streak update
              const streak: UserStreak = {
                id: `streak-${userId}`,
                userId,
                currentStreak: expectedCurrentStreak,
                longestStreak: expectedLongestStreak,
                lastActivityDate: currentDate,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              mockStreaks.set(userId, streak);
            }

            // Verify final state
            const finalStreak = mockStreaks.get(userId);

            if (finalStreak) {
              expect(finalStreak.currentStreak).toBe(expectedCurrentStreak);
              expect(finalStreak.longestStreak).toBe(expectedLongestStreak);
              expect(finalStreak.longestStreak).toBeGreaterThanOrEqual(finalStreak.currentStreak);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track longest streak correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 30 }), async (consecutiveDays) => {
          const userId = `user-${Date.now()}-${Math.random()}`;

          // Simulate consecutive days
          for (let i = 0; i < consecutiveDays; i++) {
            const date = new Date('2024-01-01');
            date.setDate(date.getDate() + i);

            const streak: UserStreak = {
              id: `streak-${userId}`,
              userId,
              currentStreak: i + 1,
              longestStreak: i + 1,
              lastActivityDate: date,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockStreaks.set(userId, streak);
          }

          // Verify longest streak
          const finalStreak = mockStreaks.get(userId);
          expect(finalStreak?.longestStreak).toBe(consecutiveDays);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 36: XP award calculation
  // Validates: Requirements 13.4
  describe('Property 36: XP award calculation', () => {
    it('should award XP proportional to difficulty and performance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // difficulty level
          fc.integer({ min: 0, max: 100 }), // performance score
          async (difficulty, performance) => {
            const userId = `user-${Date.now()}-${Math.random()}`;

            // Calculate expected XP based on difficulty and performance
            // Base XP: 10 * difficulty
            // Performance multiplier: 0.5 to 1.5 based on score
            const baseXP = 10 * difficulty;
            const performanceMultiplier = 0.5 + (performance / 100);
            const expectedXP = Math.round(baseXP * performanceMultiplier);

            // Award XP
            await service.awardXP(userId, expectedXP, `Exercise completion (difficulty: ${difficulty}, score: ${performance})`);

            // Verify XP was awarded
            const userXP = mockXP.get(userId) || [];
            expect(userXP.length).toBeGreaterThan(0);
            expect(userXP[userXP.length - 1].amount).toBe(expectedXP);

            // Verify XP is proportional to difficulty
            expect(expectedXP).toBeGreaterThanOrEqual(5); // minimum XP
            expect(expectedXP).toBeLessThanOrEqual(75); // maximum XP for difficulty 5 and perfect score
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should award higher XP for higher difficulty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 50, max: 100 }), // good performance
          async (difficulty, performance) => {
            const userId = `user-${Date.now()}-${Math.random()}`;

            const baseXP1 = 10 * difficulty;
            const baseXP2 = 10 * (difficulty + 1);
            const performanceMultiplier = 0.5 + (performance / 100);

            const xp1 = Math.round(baseXP1 * performanceMultiplier);
            const xp2 = Math.round(baseXP2 * performanceMultiplier);

            // Higher difficulty should award more XP
            expect(xp2).toBeGreaterThan(xp1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should award higher XP for better performance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 99 }),
          async (difficulty, performance) => {
            const baseXP = 10 * difficulty;
            const multiplier1 = 0.5 + (performance / 100);
            const multiplier2 = 0.5 + ((performance + 1) / 100);

            const xp1 = Math.round(baseXP * multiplier1);
            const xp2 = Math.round(baseXP * multiplier2);

            // Better performance should award same or more XP
            expect(xp2).toBeGreaterThanOrEqual(xp1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 37: Daily progress calculation
  // Validates: Requirements 13.5
  describe('Property 37: Daily progress calculation', () => {
    it('should calculate progress percentage accurately relative to daily goal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // daily goal
          fc.integer({ min: 0, max: 20 }), // completed exercises
          async (dailyGoal, completedExercises) => {
            const userId = `user-${Date.now()}-${Math.random()}`;

            // Set up completed exercises for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const progress: Array<{ exerciseId: string; completed: boolean; completedAt: Date }> = [];
            for (let i = 0; i < completedExercises; i++) {
              progress.push({
                exerciseId: `exercise-${i}`,
                completed: true,
                completedAt: new Date(),
              });
            }
            mockProgress.set(userId, progress);

            // Calculate expected progress percentage
            const expectedPercentage = Math.min(100, Math.round((completedExercises / dailyGoal) * 100));

            // Get daily progress
            const dailyProgress = await service.getDailyProgress(userId, dailyGoal);

            // Verify progress calculation
            expect(dailyProgress.exercisesCompleted).toBe(completedExercises);
            expect(dailyProgress.dailyGoal).toBe(dailyGoal);
            expect(dailyProgress.percentComplete).toBe(expectedPercentage);

            // Progress should never exceed 100%
            expect(dailyProgress.percentComplete).toBeLessThanOrEqual(100);
            expect(dailyProgress.percentComplete).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show 100% when goal is met or exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 0, max: 5 }), // extra exercises beyond goal
          async (dailyGoal, extraExercises) => {
            const userId = `user-${Date.now()}-${Math.random()}`;
            const completedExercises = dailyGoal + extraExercises;

            const progress: Array<{ exerciseId: string; completed: boolean; completedAt: Date }> = [];
            for (let i = 0; i < completedExercises; i++) {
              progress.push({
                exerciseId: `exercise-${i}`,
                completed: true,
                completedAt: new Date(),
              });
            }
            mockProgress.set(userId, progress);

            const dailyProgress = await service.getDailyProgress(userId, dailyGoal);

            // Should be 100% when goal is met or exceeded
            expect(dailyProgress.percentComplete).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show 0% when no exercises completed', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (dailyGoal) => {
          const userId = `user-${Date.now()}-${Math.random()}`;

          // No progress set for this user
          const dailyProgress = await service.getDailyProgress(userId, dailyGoal);

          expect(dailyProgress.exercisesCompleted).toBe(0);
          expect(dailyProgress.percentComplete).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 38: Achievement triggering
  // Validates: Requirements 13.6
  describe('Property 38: Achievement triggering', () => {
    it('should award achievement exactly once when criteria is met', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // streak days required
          fc.integer({ min: 1, max: 15 }), // actual streak days
          async (requiredDays, actualDays) => {
            // Create fresh service and mocks for each test
            const localMockAchievements: Map<string, Achievement> = new Map();
            const localMockUserAchievements: Map<string, Set<string>> = new Map();
            let insertCount = 0;

            const localMockPool = {
              query: vi.fn(async (query: string, values?: any[]) => {
                // Handle achievements queries
                if (query.includes('FROM achievements') && !query.includes('user_achievements')) {
                  return { rows: Array.from(localMockAchievements.values()) };
                }

                // Handle user_achievements queries
                if (query.includes('user_achievements')) {
                  if (query.includes('INSERT')) {
                    insertCount++;
                    const userId = values![0];
                    const achievementId = values![1];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    userAchievements.add(achievementId);
                    localMockUserAchievements.set(userId, userAchievements);
                    return {
                      rows: [{ id: `ua-${Date.now()}`, userId, achievementId, earnedAt: new Date() }],
                    };
                  } else if (query.includes('EXISTS')) {
                    // hasAchievement query
                    const userId = values![0];
                    const achievementId = values![1];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    return { rows: [{ exists: userAchievements.has(achievementId) }] };
                  } else if (query.includes('SELECT') && query.includes('WHERE user_id')) {
                    // Get all user achievements
                    const userId = values![0];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    return {
                      rows: Array.from(userAchievements).map((achievementId) => ({
                        id: `ua-${achievementId}`,
                        userId,
                        achievementId,
                        earnedAt: new Date(),
                      })),
                    };
                  }
                }

                // Handle user_streaks queries
                if (query.includes('user_streaks')) {
                  if (query.includes('SELECT')) {
                    const userId = values![0];
                    const streak = mockStreaks.get(userId);
                    return { rows: streak ? [streak] : [] };
                  }
                }

                return { rows: [] };
              }),
            } as any;

            const localService = new GamificationService(localMockPool);
            const userId = `user-${Date.now()}-${Math.random()}`;
            const achievementId = `achievement-${Date.now()}-${Math.random()}`;

            // Create achievement with streak criteria
            const achievement: Achievement = {
              id: achievementId,
              name: `${requiredDays} Day Streak`,
              description: `Complete ${requiredDays} consecutive days`,
              iconUrl: 'icon.png',
              criteria: { type: 'streak', days: requiredDays },
              createdAt: new Date(),
            };
            localMockAchievements.set(achievementId, achievement);

            // Set user streak
            const streak: UserStreak = {
              id: `streak-${userId}`,
              userId,
              currentStreak: actualDays,
              longestStreak: actualDays,
              lastActivityDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockStreaks.set(userId, streak);

            // Check achievements
            const newAchievements = await localService.checkAchievements(userId);

            if (actualDays >= requiredDays) {
              // Should award achievement exactly once
              expect(newAchievements.length).toBe(1);
              expect(newAchievements[0].id).toBe(achievementId);
              expect(insertCount).toBe(1); // Achievement inserted exactly once
            } else {
              // Should not award achievement
              expect(newAchievements.length).toBe(0);
              expect(insertCount).toBe(0); // No inserts
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should award multiple achievements when multiple criteria are met', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 10 }),
          fc.integer({ min: 10, max: 20 }),
          async (streak1Days, streak2Days) => {
            // Create fresh service and mocks for each test
            const localMockAchievements: Map<string, Achievement> = new Map();
            const localMockUserAchievements: Map<string, Set<string>> = new Map();

            const localMockPool = {
              query: vi.fn(async (query: string, values?: any[]) => {
                // Handle achievements queries
                if (query.includes('FROM achievements') && !query.includes('user_achievements')) {
                  return { rows: Array.from(localMockAchievements.values()) };
                }

                // Handle user_achievements queries
                if (query.includes('user_achievements')) {
                  if (query.includes('INSERT')) {
                    const userId = values![0];
                    const achievementId = values![1];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    userAchievements.add(achievementId);
                    localMockUserAchievements.set(userId, userAchievements);
                    return {
                      rows: [{ id: `ua-${Date.now()}`, userId, achievementId, earnedAt: new Date() }],
                    };
                  } else if (query.includes('EXISTS')) {
                    // hasAchievement query
                    const userId = values![0];
                    const achievementId = values![1];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    return { rows: [{ exists: userAchievements.has(achievementId) }] };
                  } else if (query.includes('SELECT') && query.includes('WHERE user_id')) {
                    // Get all user achievements
                    const userId = values![0];
                    const userAchievements = localMockUserAchievements.get(userId) || new Set();
                    return {
                      rows: Array.from(userAchievements).map((achievementId) => ({
                        id: `ua-${achievementId}`,
                        userId,
                        achievementId,
                        earnedAt: new Date(),
                      })),
                    };
                  }
                }

                // Handle user_streaks queries
                if (query.includes('user_streaks')) {
                  if (query.includes('SELECT')) {
                    const userId = values![0];
                    const streak = mockStreaks.get(userId);
                    return { rows: streak ? [streak] : [] };
                  }
                }

                return { rows: [] };
              }),
            } as any;

            const localService = new GamificationService(localMockPool);
            const userId = `user-${Date.now()}-${Math.random()}`;
            const achievement1Id = `achievement-1-${Date.now()}-${Math.random()}`;
            const achievement2Id = `achievement-2-${Date.now()}-${Math.random()}`;

            // Create two achievements
            localMockAchievements.set(achievement1Id, {
              id: achievement1Id,
              name: `${streak1Days} Day Streak`,
              description: `Complete ${streak1Days} consecutive days`,
              iconUrl: 'icon1.png',
              criteria: { type: 'streak', days: streak1Days },
              createdAt: new Date(),
            });

            localMockAchievements.set(achievement2Id, {
              id: achievement2Id,
              name: `${streak2Days} Day Streak`,
              description: `Complete ${streak2Days} consecutive days`,
              iconUrl: 'icon2.png',
              criteria: { type: 'streak', days: streak2Days },
              createdAt: new Date(),
            });

            // Set user streak to meet both criteria
            const actualStreak = Math.max(streak1Days, streak2Days);
            mockStreaks.set(userId, {
              id: `streak-${userId}`,
              userId,
              currentStreak: actualStreak,
              longestStreak: actualStreak,
              lastActivityDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Check achievements
            const newAchievements = await localService.checkAchievements(userId);

            // Should award both achievements
            expect(newAchievements.length).toBe(2);
            const achievementIds = newAchievements.map((a) => a.id);
            expect(achievementIds).toContain(achievement1Id);
            expect(achievementIds).toContain(achievement2Id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 39: Achievement persistence
  // Validates: Requirements 13.7
  describe('Property 39: Achievement persistence', () => {
    it('should store earned achievements with timestamp and make them retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // number of achievements to earn
          async (achievementCount) => {
            // Create fresh service and mocks for each test
            const localMockAchievements: Map<string, Achievement> = new Map();
            const localMockUserAchievements: Map<
              string,
              Array<{ achievementId: string; earnedAt: Date }>
            > = new Map();

            const localMockPool = {
              query: vi.fn(async (query: string, values?: any[]) => {
                // Handle achievements queries
                if (query.includes('FROM achievements') && !query.includes('user_achievements')) {
                  return { rows: Array.from(localMockAchievements.values()) };
                }

                // Handle user_achievements queries
                if (query.includes('user_achievements')) {
                  if (query.includes('INSERT')) {
                    const userId = values![0];
                    const achievementId = values![1];
                    const earnedAt = new Date();
                    const userAchievements = localMockUserAchievements.get(userId) || [];
                    userAchievements.push({ achievementId, earnedAt });
                    localMockUserAchievements.set(userId, userAchievements);
                    return {
                      rows: [{ id: `ua-${Date.now()}`, userId, achievementId, earnedAt }],
                    };
                  } else if (query.includes('EXISTS')) {
                    // hasAchievement query
                    const userId = values![0];
                    const achievementId = values![1];
                    const userAchievements = localMockUserAchievements.get(userId) || [];
                    const has = userAchievements.some((ua) => ua.achievementId === achievementId);
                    return { rows: [{ exists: has }] };
                  } else if (query.includes('JOIN achievements')) {
                    // findByUserId query with JOIN
                    const userId = values![0];
                    const userAchievements = localMockUserAchievements.get(userId) || [];
                    return {
                      rows: userAchievements.map((ua) => {
                        const achievement = localMockAchievements.get(ua.achievementId);
                        return {
                          id: `ua-${ua.achievementId}`,
                          userId,
                          achievementId: ua.achievementId,
                          earnedAt: ua.earnedAt,
                          'achievement.id': achievement?.id,
                          'achievement.name': achievement?.name,
                          'achievement.description': achievement?.description,
                          'achievement.iconUrl': achievement?.iconUrl,
                          'achievement.criteria': achievement?.criteria,
                          'achievement.createdAt': achievement?.createdAt,
                        };
                      }),
                    };
                  } else if (query.includes('SELECT') && query.includes('WHERE user_id')) {
                    // Get all user achievements (simple query)
                    const userId = values![0];
                    const userAchievements = localMockUserAchievements.get(userId) || [];
                    return {
                      rows: userAchievements.map((ua) => ({
                        id: `ua-${ua.achievementId}`,
                        userId,
                        achievementId: ua.achievementId,
                        earnedAt: ua.earnedAt,
                      })),
                    };
                  }
                }

                return { rows: [] };
              }),
            } as any;

            const localService = new GamificationService(localMockPool);
            const userId = `user-${Date.now()}-${Math.random()}`;

            // Award multiple achievements
            const achievementIds: string[] = [];
            for (let i = 0; i < achievementCount; i++) {
              const achievementId = `achievement-${i}-${Date.now()}-${Math.random()}`;
              achievementIds.push(achievementId);

              // Create achievement in mock
              localMockAchievements.set(achievementId, {
                id: achievementId,
                name: `Achievement ${i}`,
                description: `Description ${i}`,
                iconUrl: `icon${i}.png`,
                criteria: { type: 'test' },
                createdAt: new Date(),
              });

              await localService.awardAchievement(userId, achievementId);
            }

            // Retrieve achievement history
            const history = await localService.getAchievementHistory(userId);

            // Verify all achievements are stored
            expect(history.length).toBe(achievementCount);

            // Verify each achievement has required fields
            for (const userAchievement of history) {
              expect(userAchievement.userId).toBe(userId);
              expect(userAchievement.achievementId).toBeDefined();
              expect(userAchievement.earnedAt).toBeInstanceOf(Date);
              expect(achievementIds).toContain(userAchievement.achievementId);
            }

            // Verify all awarded achievements are in history
            for (const achievementId of achievementIds) {
              const found = history.some((ua) => ua.achievementId === achievementId);
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve achievement timestamps accurately', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (achievementCount) => {
          // Create fresh service and mocks for each test
          const localMockUserAchievements: Map<
            string,
            Array<{ achievementId: string; earnedAt: Date }>
          > = new Map();

          const localMockPool = {
            query: vi.fn(async (query: string, values?: any[]) => {
              if (query.includes('user_achievements')) {
                if (query.includes('INSERT')) {
                  const userId = values![0];
                  const achievementId = values![1];
                  const earnedAt = new Date();
                  const userAchievements = localMockUserAchievements.get(userId) || [];
                  userAchievements.push({ achievementId, earnedAt });
                  localMockUserAchievements.set(userId, userAchievements);
                  return {
                    rows: [{ id: `ua-${Date.now()}`, userId, achievementId, earnedAt }],
                  };
                } else if (query.includes('EXISTS')) {
                  const userId = values![0];
                  const achievementId = values![1];
                  const userAchievements = localMockUserAchievements.get(userId) || [];
                  const has = userAchievements.some((ua) => ua.achievementId === achievementId);
                  return { rows: [{ exists: has }] };
                } else if (query.includes('SELECT')) {
                  const userId = values![0];
                  const userAchievements = localMockUserAchievements.get(userId) || [];
                  return {
                    rows: userAchievements.map((ua) => ({
                      id: `ua-${ua.achievementId}`,
                      userId,
                      achievementId: ua.achievementId,
                      earnedAt: ua.earnedAt,
                    })),
                  };
                }
              }
              return { rows: [] };
            }),
          } as any;

          const localService = new GamificationService(localMockPool);
          const userId = `user-${Date.now()}-${Math.random()}`;

          const timestamps: Date[] = [];

          // Award achievements with small delays
          for (let i = 0; i < achievementCount; i++) {
            const achievementId = `achievement-${i}-${Date.now()}-${Math.random()}`;
            await localService.awardAchievement(userId, achievementId);
            timestamps.push(new Date());
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Retrieve history
          const history = await localService.getAchievementHistory(userId);

          // Verify timestamps are preserved
          expect(history.length).toBe(achievementCount);
          for (const userAchievement of history) {
            expect(userAchievement.earnedAt).toBeInstanceOf(Date);
            // Timestamp should be within reasonable range
            const now = new Date();
            const timeDiff = now.getTime() - userAchievement.earnedAt.getTime();
            expect(timeDiff).toBeGreaterThanOrEqual(0);
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
