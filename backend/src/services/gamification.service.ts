import { Pool } from 'pg';
import { UserStreakRepository } from '../repositories/userStreak.repository.js';
import { UserXPRepository } from '../repositories/userXP.repository.js';
import { AchievementRepository } from '../repositories/achievement.repository.js';
import { UserAchievementRepository } from '../repositories/userAchievement.repository.js';
import { UserStreak } from '../models/userStreak.model.js';
import { Achievement, UserAchievement } from '../models/index.js';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
}

export interface DailyProgress {
  exercisesCompleted: number;
  dailyGoal: number;
  xpEarned: number;
  percentComplete: number;
}

export class GamificationService {
  private userStreakRepo: UserStreakRepository;
  private userXPRepo: UserXPRepository;
  private achievementRepo: AchievementRepository;
  private userAchievementRepo: UserAchievementRepository;

  constructor(private pool: Pool) {
    this.userStreakRepo = new UserStreakRepository(pool);
    this.userXPRepo = new UserXPRepository(pool);
    this.achievementRepo = new AchievementRepository(pool);
    this.userAchievementRepo = new UserAchievementRepository(pool);
  }

  /**
   * Update user's daily streak based on activity
   * Increments streak for consecutive days, resets on miss
   */
  async updateStreak(userId: string): Promise<StreakInfo> {
    const existingStreak = await this.userStreakRepo.findByUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!existingStreak) {
      // First time activity - create streak
      const newStreak = await this.userStreakRepo.upsert(userId, {
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      });
      return {
        currentStreak: newStreak.currentStreak,
        longestStreak: newStreak.longestStreak,
        lastActivityDate: newStreak.lastActivityDate,
      };
    }

    const lastActivity = new Date(existingStreak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    // Check if already updated today
    if (lastActivity.getTime() === today.getTime()) {
      return {
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        lastActivityDate: existingStreak.lastActivityDate,
      };
    }

    // Calculate days difference
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak: number;
    if (daysDiff === 1) {
      // Consecutive day - increment streak
      newCurrentStreak = existingStreak.currentStreak + 1;
    } else {
      // Missed days - reset streak
      newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(existingStreak.longestStreak, newCurrentStreak);

    const updatedStreak = await this.userStreakRepo.update(userId, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: today,
    });

    return {
      currentStreak: updatedStreak.currentStreak,
      longestStreak: updatedStreak.longestStreak,
      lastActivityDate: updatedStreak.lastActivityDate,
    };
  }

  /**
   * Award XP to user based on activity
   */
  async awardXP(userId: string, amount: number, reason: string): Promise<number> {
    await this.userXPRepo.create({
      userId,
      amount,
      reason,
    });

    return this.userXPRepo.getTotalXP(userId);
  }

  /**
   * Check and award achievements based on user activity
   */
  async checkAchievements(userId: string): Promise<Achievement[]> {
    const allAchievements = await this.achievementRepo.findAll();
    const userAchievements = await this.userAchievementRepo.findByUserId(userId);
    const earnedAchievementIds = new Set(userAchievements.map((ua) => ua.achievementId));

    const newAchievements: Achievement[] = [];

    for (const achievement of allAchievements) {
      // Skip if already earned
      if (earnedAchievementIds.has(achievement.id)) {
        continue;
      }

      // Check if criteria is met
      const isMet = await this.checkAchievementCriteria(userId, achievement.criteria);
      if (isMet) {
        await this.awardAchievement(userId, achievement.id);
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  /**
   * Award a specific achievement to user
   */
  async awardAchievement(userId: string, achievementId: string): Promise<void> {
    const hasAchievement = await this.userAchievementRepo.hasAchievement(userId, achievementId);
    if (hasAchievement) {
      return; // Already has this achievement
    }

    await this.userAchievementRepo.create({
      userId,
      achievementId,
    });
  }

  /**
   * Get daily progress towards goals
   */
  async getDailyProgress(userId: string, dailyGoal: number = 10): Promise<DailyProgress> {
    const today = new Date();

    // Get exercises completed today
    const exercisesQuery = `
      SELECT COUNT(*) as count
      FROM user_progress
      WHERE user_id = $1
        AND completed = true
        AND DATE(completed_at) = DATE($2)
    `;
    const exercisesResult = await this.pool.query(exercisesQuery, [userId, today]);
    const exercisesCompleted = parseInt(exercisesResult.rows[0].count, 10);

    // Get XP earned today
    const xpEarned = await this.userXPRepo.getDailyXP(userId, today);

    const percentComplete = Math.min(100, Math.round((exercisesCompleted / dailyGoal) * 100));

    return {
      exercisesCompleted,
      dailyGoal,
      xpEarned,
      percentComplete,
    };
  }

  /**
   * Get user's achievement history
   */
  async getAchievementHistory(userId: string): Promise<UserAchievement[]> {
    return this.userAchievementRepo.findByUserId(userId);
  }

  /**
   * Check if achievement criteria is met
   */
  private async checkAchievementCriteria(
    userId: string,
    criteria: Record<string, any>
  ): Promise<boolean> {
    const { type } = criteria;

    switch (type) {
      case 'streak':
        return this.checkStreakCriteria(userId, criteria);
      case 'lessons_completed':
        return this.checkLessonsCompletedCriteria(userId, criteria);
      case 'perfect_scores':
        return this.checkPerfectScoresCriteria(userId, criteria);
      case 'xp_total':
        return this.checkXPTotalCriteria(userId, criteria);
      default:
        return false;
    }
  }

  private async checkStreakCriteria(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const streak = await this.userStreakRepo.findByUserId(userId);
    if (!streak) return false;

    const { days } = criteria;
    return streak.currentStreak >= days;
  }

  private async checkLessonsCompletedCriteria(
    userId: string,
    criteria: Record<string, any>
  ): Promise<boolean> {
    const { count } = criteria;
    const query = `
      SELECT COUNT(DISTINCT lesson_id) as count
      FROM user_progress up
      JOIN exercises e ON up.exercise_id = e.id
      WHERE up.user_id = $1 AND up.completed = true
    `;
    const result = await this.pool.query(query, [userId]);
    const lessonsCompleted = parseInt(result.rows[0].count, 10);
    return lessonsCompleted >= count;
  }

  private async checkPerfectScoresCriteria(
    userId: string,
    criteria: Record<string, any>
  ): Promise<boolean> {
    const { count } = criteria;
    const query = `
      SELECT COUNT(*) as count
      FROM pronunciation_scores
      WHERE user_id = $1 AND score >= 95
    `;
    const result = await this.pool.query(query, [userId]);
    const perfectScores = parseInt(result.rows[0].count, 10);
    return perfectScores >= count;
  }

  private async checkXPTotalCriteria(userId: string, criteria: Record<string, any>): Promise<boolean> {
    const { amount } = criteria;
    const totalXP = await this.userXPRepo.getTotalXP(userId);
    return totalXP >= amount;
  }
}
