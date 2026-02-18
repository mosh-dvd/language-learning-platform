import { Router, Request, Response } from 'express';
import multer from 'multer';
import { imageService } from '../services/image.service.js';
import { ImageMetadata } from '../models/image.model.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10485760, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * @swagger
 * /api/images:
 *   post:
 *     summary: Upload a new image
 *     tags: [Images]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - altText
 *               - createdBy
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, or WebP, max 10MB)
 *               altText:
 *                 type: string
 *                 description: Accessibility alt text
 *               createdBy:
 *                 type: string
 *                 format: uuid
 *                 description: User ID of uploader
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 *       400:
 *         description: Invalid file or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * POST /api/images
 * Upload a new image
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { altText, createdBy } = req.body;

    if (!altText || altText.trim().length === 0) {
      return res.status(400).json({ error: 'Alt text is required for accessibility' });
    }

    if (!createdBy) {
      return res.status(400).json({ error: 'createdBy is required' });
    }

    const metadata: ImageMetadata = {
      filename: req.file.originalname,
      mimeType: req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp',
      size: req.file.size,
    };

    const image = await imageService.uploadImage({
      buffer: req.file.buffer,
      metadata,
      altText: altText.trim(),
      createdBy,
    });

    res.status(201).json(image);
  } catch (error) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Get image metadata by ID
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/images/:id
 * Get image metadata by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const image = await imageService.getImage(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

/**
 * @swagger
 * /api/images/{id}/file:
 *   get:
 *     summary: Get image file data
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image file retrieved successfully
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * GET /api/images/:id/file
 * Get image file data
 */
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { buffer, image } = await imageService.getImageFile(id);

    res.set('Content-Type', image.mimeType);
    res.set('Content-Length', image.sizeBytes.toString());
    res.send(buffer);
  } catch (error) {
    console.error('Error retrieving image file:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve image file';
    
    if (message === 'Image not found') {
      return res.status(404).json({ error: message });
    }
    
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: List all images with optional filters
 *     tags: [Images]
 *     parameters:
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by creator user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 */
/**
 * GET /api/images
 * List all images with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { createdBy, limit, offset } = req.query;

    const filters = {
      createdBy: createdBy as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    };

    const images = await imageService.listImages(filters);
    res.json(images);
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Delete an image
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       204:
 *         description: Image deleted successfully
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await imageService.deleteImage(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting image:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete image';
    
    if (message === 'Image not found') {
      return res.status(404).json({ error: message });
    }
    
    res.status(500).json({ error: message });
  }
});

export default router;
