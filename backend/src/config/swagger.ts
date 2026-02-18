import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Language Learning Platform API',
      version: '1.0.0',
      description: 'API documentation for the Language Learning Platform - an immersive language learning application similar to Rosetta Stone',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.languagelearning.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User display name',
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to user avatar image',
            },
            nativeLanguage: {
              type: 'string',
              description: 'User native language code (e.g., en, es, fr)',
            },
            oauthProvider: {
              type: 'string',
              enum: ['google', 'facebook'],
              description: 'OAuth provider if user registered via OAuth',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Image: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique image identifier',
            },
            filename: {
              type: 'string',
              description: 'Original filename',
            },
            storagePath: {
              type: 'string',
              description: 'Path to stored image file',
            },
            mimeType: {
              type: 'string',
              enum: ['image/jpeg', 'image/png', 'image/webp'],
              description: 'Image MIME type',
            },
            sizeBytes: {
              type: 'integer',
              description: 'File size in bytes',
            },
            altText: {
              type: 'string',
              description: 'Accessibility alt text',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who uploaded the image',
            },
          },
        },
        ImageText: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique text identifier',
            },
            imageId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated image ID',
            },
            languageCode: {
              type: 'string',
              description: 'Language code (e.g., en, es, fr)',
            },
            text: {
              type: 'string',
              description: 'Text content in the specified language',
            },
            version: {
              type: 'integer',
              description: 'Version number for history tracking',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Lesson: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique lesson identifier',
            },
            title: {
              type: 'string',
              description: 'Lesson title',
            },
            targetLanguage: {
              type: 'string',
              description: 'Target language code',
            },
            published: {
              type: 'boolean',
              description: 'Whether the lesson is published',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who created the lesson',
            },
          },
        },
        Exercise: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique exercise identifier',
            },
            lessonId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated lesson ID',
            },
            imageId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated image ID',
            },
            exerciseType: {
              type: 'string',
              enum: ['image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension'],
              description: 'Type of exercise',
            },
            orderIndex: {
              type: 'integer',
              description: 'Order position within the lesson',
            },
            metadata: {
              type: 'object',
              description: 'Exercise-specific metadata (varies by type)',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        UserProgress: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique progress record identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            exerciseId: {
              type: 'string',
              format: 'uuid',
              description: 'Exercise ID',
            },
            completed: {
              type: 'boolean',
              description: 'Whether the exercise is completed',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Completion timestamp',
            },
            lastAccessed: {
              type: 'string',
              format: 'date-time',
              description: 'Last access timestamp',
            },
          },
        },
        PronunciationScore: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique score record identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            exerciseId: {
              type: 'string',
              format: 'uuid',
              description: 'Exercise ID',
            },
            score: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 100,
              description: 'Pronunciation score (0-100)',
            },
            recognizedText: {
              type: 'string',
              description: 'Text recognized from speech',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Score timestamp',
            },
          },
        },
        UserStreak: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique streak record identifier',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            currentStreak: {
              type: 'integer',
              description: 'Current consecutive days streak',
            },
            longestStreak: {
              type: 'integer',
              description: 'Longest streak achieved',
            },
            lastActivityDate: {
              type: 'string',
              format: 'date',
              description: 'Date of last activity',
            },
          },
        },
        Achievement: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique achievement identifier',
            },
            name: {
              type: 'string',
              description: 'Achievement name',
            },
            description: {
              type: 'string',
              description: 'Achievement description',
            },
            iconUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL to achievement icon',
            },
            criteria: {
              type: 'object',
              description: 'Criteria for earning the achievement',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Images',
        description: 'Image upload and management',
      },
      {
        name: 'Image Texts',
        description: 'Multi-language text management for images',
      },
      {
        name: 'Lessons',
        description: 'Lesson creation and management',
      },
      {
        name: 'Exercises',
        description: 'Exercise management within lessons',
      },
      {
        name: 'Progress',
        description: 'User progress tracking',
      },
      {
        name: 'Languages',
        description: 'Language preference management',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
