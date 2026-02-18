import { Router, Response } from 'express';
import { progressService } from '../services/progress.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const RecordCompletionSchema = z.object({
  exerciseId: z.string().uuid(),
});

const RecordPronunciationScoreSchema = z.object({
  exerciseId: z.string().uuid(),
  score: z.number().min(0).max(100),
  recognizedText: z.string(),
});

const SyncProgressSchema = z.object({
  progressUpdates: z.array(z.object({
    exerciseId: z.string().uuid(),
    completed: z.boolean(),
    completedAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  })),
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/progress/complete:
 *   post:
 *     summary: Record exercise completion
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exerciseId
 *             properties:
 *               exerciseId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Exercise completion recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 progress:
 *                   $ref: '#/components/schemas/UserProgress'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/progress/complete
 * Record exercise completion
 */
router.post('/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { exerciseId } = RecordCompletionSchema.parse(req.body);
    const progress = await progressService.recordExerciseCompletion(req.user.userId, exerciseId);

    res.status(201).json({
      message: 'Exercise completion recorded',
      progress,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/pronunciation:
 *   post:
 *     summary: Record pronunciation score
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exerciseId
 *               - score
 *               - recognizedText
 *             properties:
 *               exerciseId:
 *                 type: string
 *                 format: uuid
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               recognizedText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pronunciation score recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pronunciationScore:
 *                   $ref: '#/components/schemas/PronunciationScore'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/progress/pronunciation
 * Record pronunciation score
 */
router.post('/pronunciation', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { exerciseId, score, recognizedText } = RecordPronunciationScoreSchema.parse(req.body);
    const pronunciationScore = await progressService.recordPronunciationScore(
      req.user.userId,
      exerciseId,
      score,
      recognizedText
    );

    res.status(201).json({
      message: 'Pronunciation score recorded',
      pronunciationScore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get user's overall progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProgress'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress
 * Get user's overall progress
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progress = await progressService.getUserProgress(req.user.userId);

    res.json({ progress });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/lesson/{lessonId}:
 *   get:
 *     summary: Get progress for a specific lesson
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lesson progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress/lesson/:lessonId
 * Get progress for a specific lesson
 */
router.get('/lesson/:lessonId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { lessonId } = req.params;
    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const progress = await progressService.getLessonProgress(req.user.userId, lessonId);

    res.json({ progress });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/exercise/{exerciseId}:
 *   get:
 *     summary: Get progress for a specific exercise
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Exercise progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   $ref: '#/components/schemas/UserProgress'
 *       404:
 *         description: Progress not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress/exercise/:exerciseId
 * Get progress for a specific exercise
 */
router.get('/exercise/:exerciseId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { exerciseId } = req.params;
    if (!exerciseId) {
      res.status(400).json({ error: 'Exercise ID is required' });
      return;
    }

    const progress = await progressService.getExerciseProgress(req.user.userId, exerciseId);

    if (!progress) {
      res.status(404).json({ error: 'Progress not found' });
      return;
    }

    res.json({ progress });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/sync:
 *   post:
 *     summary: Synchronize progress from multiple devices
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progressUpdates
 *             properties:
 *               progressUpdates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     exerciseId:
 *                       type: string
 *                       format: uuid
 *                     completed:
 *                       type: boolean
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Progress synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 syncedCount:
 *                   type: integer
 *                 progress:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProgress'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/progress/sync
 * Synchronize progress from multiple devices
 */
router.post('/sync', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { progressUpdates } = SyncProgressSchema.parse(req.body);
    const syncedProgress = await progressService.syncProgress(req.user.userId, progressUpdates);

    res.json({
      message: 'Progress synchronized',
      syncedCount: syncedProgress.length,
      progress: syncedProgress,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/pronunciation/exercise/{exerciseId}:
 *   get:
 *     summary: Get pronunciation scores for a specific exercise
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pronunciation scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scores:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PronunciationScore'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress/pronunciation/exercise/:exerciseId
 * Get pronunciation scores for a specific exercise
 */
router.get('/pronunciation/exercise/:exerciseId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { exerciseId } = req.params;
    if (!exerciseId) {
      res.status(400).json({ error: 'Exercise ID is required' });
      return;
    }

    const scores = await progressService.getPronunciationScores(req.user.userId, exerciseId);

    res.json({ scores });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/pronunciation:
 *   get:
 *     summary: Get all pronunciation scores for the user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All pronunciation scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scores:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PronunciationScore'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress/pronunciation
 * Get all pronunciation scores for the user
 */
router.get('/pronunciation', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const scores = await progressService.getAllPronunciationScores(req.user.userId);

    res.json({ scores });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/progress/lesson/{lessonId}/last-accessed:
 *   get:
 *     summary: Get the last accessed exercise in a lesson for progress restoration
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Last accessed exercise retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lessonId:
 *                   type: string
 *                   format: uuid
 *                 lastAccessedExerciseIndex:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/progress/lesson/:lessonId/last-accessed
 * Get the last accessed exercise in a lesson for progress restoration
 */
router.get('/lesson/:lessonId/last-accessed', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { lessonId } = req.params;
    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const exerciseIndex = await progressService.getLastAccessedExercise(req.user.userId, lessonId);

    res.json({ 
      lessonId,
      lastAccessedExerciseIndex: exerciseIndex,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
