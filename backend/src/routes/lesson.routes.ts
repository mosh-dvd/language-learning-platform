import { Router, Request, Response } from 'express';
import { lessonService } from '../services/lesson.service.js';
import { CreateLessonSchema, UpdateLessonSchema } from '../models/lesson.model.js';

const router = Router();

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lessons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - targetLanguage
 *               - createdBy
 *             properties:
 *               title:
 *                 type: string
 *               targetLanguage:
 *                 type: string
 *               createdBy:
 *                 type: string
 *                 format: uuid
 *               published:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/lessons
 * Create a new lesson
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateLessonSchema.parse(req.body);
    const lesson = await lessonService.createLesson(input);
    res.status(201).json(lesson);
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
 * /api/lessons/{id}:
 *   get:
 *     summary: Get a lesson by ID
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lesson retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/lessons/:id
 * Get a lesson by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await lessonService.getLesson(id);
    
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    
    res.status(200).json(lesson);
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
 * /api/lessons:
 *   get:
 *     summary: Get all lessons or filter by language
 *     tags: [Lessons]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by target language code
 *     responses:
 *       200:
 *         description: List of lessons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lesson'
 */
/**
 * GET /api/lessons
 * Get all lessons or filter by language
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { language } = req.query;
    
    let lessons;
    if (language) {
      lessons = await lessonService.getLessonsByLanguage(language as string);
    } else {
      lessons = await lessonService.getAllLessons();
    }
    
    res.status(200).json(lessons);
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
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
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
 *               title:
 *                 type: string
 *               targetLanguage:
 *                 type: string
 *               published:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/lessons/:id
 * Update a lesson
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input = UpdateLessonSchema.parse(req.body);
    const lesson = await lessonService.updateLesson(id, input);
    
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    
    res.status(200).json(lesson);
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
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Lesson deleted successfully
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * DELETE /api/lessons/:id
 * Delete a lesson
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lessonService.deleteLesson(id);
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
 * /api/lessons/{id}/publish:
 *   put:
 *     summary: Publish a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lesson published successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/lessons/:id/publish
 * Publish a lesson
 */
router.put('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await lessonService.publishLesson(id);
    
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    
    res.status(200).json(lesson);
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
 * /api/lessons/{id}/unpublish:
 *   put:
 *     summary: Unpublish a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lesson unpublished successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lesson'
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/lessons/:id/unpublish
 * Unpublish a lesson
 */
router.put('/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await lessonService.unpublishLesson(id);
    
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }
    
    res.status(200).json(lesson);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

export default router;
