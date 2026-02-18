import { Router, Request, Response } from 'express';
import { imageTextService } from '../services/imageText.service.js';
import { CreateImageTextSchema, UpdateImageTextSchema } from '../models/imageText.model.js';

const router = Router();

/**
 * @swagger
 * /api/image-texts:
 *   post:
 *     summary: Add text to an image in a specific language
 *     tags: [Image Texts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageId
 *               - languageCode
 *               - text
 *             properties:
 *               imageId:
 *                 type: string
 *                 format: uuid
 *               languageCode:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Text added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageText'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/image-texts
 * Add text to an image in a specific language
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateImageTextSchema.parse(req.body);
    const imageText = await imageTextService.addText(input);
    res.status(201).json(imageText);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.name === 'ZodError') {
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
 * /api/image-texts/{imageId}/{languageCode}:
 *   put:
 *     summary: Update text for an image in a specific language (creates new version)
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Text updated successfully (new version created)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageText'
 *       404:
 *         description: Image or text not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * PUT /api/image-texts/:imageId/:languageCode
 * Update text for an image in a specific language (creates new version)
 */
router.put('/:imageId/:languageCode', async (req: Request, res: Response) => {
  try {
    const { imageId, languageCode } = req.params;
    const input = UpdateImageTextSchema.parse(req.body);
    const imageText = await imageTextService.updateText(imageId, languageCode, input);
    res.status(200).json(imageText);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.name === 'ZodError') {
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
 * /api/image-texts/{imageId}/{languageCode}:
 *   get:
 *     summary: Get the latest text for an image in a specific language
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Text retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageText'
 *       404:
 *         description: Text not found for this image and language
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/image-texts/:imageId/:languageCode
 * Get the latest text for an image in a specific language
 */
router.get('/:imageId/:languageCode', async (req: Request, res: Response) => {
  try {
    const { imageId, languageCode } = req.params;
    const imageText = await imageTextService.getTextByLanguage(imageId, languageCode);
    
    if (!imageText) {
      res.status(404).json({ 
        error: `No text found for image ${imageId} in language ${languageCode}` 
      });
      return;
    }
    
    res.status(200).json(imageText);
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
 * /api/image-texts/{imageId}/{languageCode}/history:
 *   get:
 *     summary: Get version history for an image in a specific language
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Version history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImageText'
 */
/**
 * GET /api/image-texts/:imageId/:languageCode/history
 * Get version history for an image in a specific language
 */
router.get('/:imageId/:languageCode/history', async (req: Request, res: Response) => {
  try {
    const { imageId, languageCode } = req.params;
    const history = await imageTextService.getVersionHistory(imageId, languageCode);
    res.status(200).json(history);
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
 * /api/image-texts/{imageId}/{languageCode}/versions/{version}:
 *   get:
 *     summary: Get a specific version of text
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Specific version retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageText'
 *       400:
 *         description: Invalid version number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Version not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/image-texts/:imageId/:languageCode/versions/:version
 * Get a specific version of text
 */
router.get('/:imageId/:languageCode/versions/:version', async (req: Request, res: Response) => {
  try {
    const { imageId, languageCode, version } = req.params;
    const versionNumber = parseInt(version, 10);
    
    if (isNaN(versionNumber) || versionNumber < 1) {
      res.status(400).json({ error: 'Invalid version number' });
      return;
    }
    
    const imageText = await imageTextService.getTextVersion(
      imageId,
      languageCode,
      versionNumber
    );
    
    if (!imageText) {
      res.status(404).json({ 
        error: `Version ${version} not found for image ${imageId} in language ${languageCode}` 
      });
      return;
    }
    
    res.status(200).json(imageText);
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
 * /api/image-texts/{imageId}/languages:
 *   get:
 *     summary: Get all available languages for an image
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Available languages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: string
 */
/**
 * GET /api/image-texts/:imageId/languages
 * Get all available languages for an image
 */
router.get('/:imageId/languages', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const languages = await imageTextService.getAvailableLanguages(imageId);
    res.status(200).json({ languages });
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
 * /api/image-texts/{imageId}:
 *   get:
 *     summary: Get all texts for an image (latest version of each language)
 *     tags: [Image Texts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: All texts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImageText'
 */
/**
 * GET /api/image-texts/:imageId
 * Get all texts for an image (latest version of each language)
 */
router.get('/:imageId', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const texts = await imageTextService.getAllTextsForImage(imageId);
    res.status(200).json(texts);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

export default router;
