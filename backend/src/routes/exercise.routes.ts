import { Router, Request, Response } from 'express';
import { exerciseService } from '../services/exercise.service.js';
import { CreateExerciseSchema, UpdateExerciseSchema } from '../models/exercise.model.js';

const router = Router();

/**
 * @swagger
 * /api/exercises:
 *   post:
 *     summary: Create a new exercise
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonId
 *               - imageId
 *               - exerciseType
 *               - orderIndex
 *             properties:
 *               lessonId:
 *                 type: string
 *                 format: uuid
 *               imageId:
 *                 type: string
 *                 format: uuid
 *               exerciseType:
 *                 type: string
 *                 enum: [image_text, matching_pairs, fill_in_blank, listening_comprehension]
 *               orderIndex:
 *                 type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Exercise created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exercise'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/exercises
 * Create a new exercise
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateExerciseSchema.parse(req.body);
    const exercise = await exerciseService.createExercise(input);
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error });
      } else {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get an exercise by ID
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Exercise retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exercise'
 *       404:
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/exercises/:id
 * Get an exercise by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exercise = await exerciseService.getExercise(id);
    
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }
    
    res.status(200).json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * @swagger
 * /api/exercises/lesson/{lessonId}:
 *   get:
 *     summary: Get all exercises for a lesson
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of exercises
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exercise'
 */
/**
 * GET /api/exercises/lesson/:lessonId
 * Get all exercises for a lesson
 */
router.get('/lesson/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const exercises = await exerciseService.getExercisesByLesson(lessonId);
    res.status(200).json(exercises);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   put:
 *     summary: Update an exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageId:
 *                 type: string
 *                 format: uuid
 *               exerciseType:
 *                 type: string
 *                 enum: [image_text, matching_pairs, fill_in_blank, listening_comprehension]
 *               orderIndex:
 *                 type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Exercise updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exercise'
 *       404:
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/exercises/:id
 * Update an exercise
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = UpdateExerciseSchema.parse(req.body);
    const exercise = await exerciseService.updateExercise(id, input);
    
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }
    
    res.status(200).json(exercise);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error });
      } else {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * @swagger
 * /api/exercises/{id}:
 *   delete:
 *     summary: Delete an exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Exercise deleted successfully
 *       404:
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * DELETE /api/exercises/:id
 * Delete an exercise
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await exerciseService.deleteExercise(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

/**
 * @swagger
 * /api/exercises/lesson/{lessonId}/reorder:
 *   put:
 *     summary: Reorder exercises in a lesson
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exerciseIds
 *             properties:
 *               exerciseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of exercise IDs in desired order
 *     responses:
 *       200:
 *         description: Exercises reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/exercises/lesson/:lessonId/reorder
 * Reorder exercises in a lesson
 */
router.put('/lesson/:lessonId/reorder', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { exerciseIds } = req.body;
    
    if (!Array.isArray(exerciseIds)) {
      res.status(400).json({ error: 'exerciseIds must be an array' });
      return;
    }
    
    await exerciseService.reorderExercises(lessonId, { exerciseIds });
    res.status(200).json({ message: 'Exercises reordered successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

export default router;
