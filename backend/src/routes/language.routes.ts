import { Router, Response } from 'express';
import { languagePreferenceService } from '../services/languagePreference.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/languages/supported:
 *   get:
 *     summary: Get list of supported languages
 *     tags: [Languages]
 *     responses:
 *       200:
 *         description: List of supported languages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 */
// Get supported languages
router.get('/supported', (req, res: Response): void => {
  const languages = languagePreferenceService.getSupportedLanguages();
  res.json({ languages });
});

/**
 * @swagger
 * /api/languages/preference:
 *   get:
 *     summary: Get user's language preference
 *     tags: [Languages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Language preference retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 language:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get user's language preference
router.get('/preference', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const language = await languagePreferenceService.getLanguagePreference(req.user.userId);
      res.json({ language });
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
 * /api/languages/preference:
 *   post:
 *     summary: Set user's language preference
 *     tags: [Languages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - languageCode
 *             properties:
 *               languageCode:
 *                 type: string
 *                 description: Language code (e.g., en, es, fr)
 *     responses:
 *       200:
 *         description: Language preference updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid language code
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
// Set user's language preference
router.post('/preference', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { languageCode } = req.body;

      if (!languageCode) {
        res.status(400).json({ error: 'Language code is required' });
        return;
      }

      await languagePreferenceService.setLanguagePreference(req.user.userId, languageCode);
      res.json({ message: 'Language preference updated successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

export default router;
