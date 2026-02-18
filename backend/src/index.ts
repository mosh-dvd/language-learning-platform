import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import imageRoutes from './routes/image.routes.js'
import imageTextRoutes from './routes/imageText.routes.js'
import progressRoutes from './routes/progress.routes.js'
import lessonRoutes from './routes/lesson.routes.js'
import exerciseRoutes from './routes/exercise.routes.js'
import authRoutes from './routes/auth.routes.js'
import languageRoutes from './routes/language.routes.js'
import logger, { stream, logApiRequest } from './utils/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js'
import { swaggerSpec } from './config/swagger.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// HTTP request logging with Morgan
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream }))

// Custom request logging middleware for structured logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const userId = (req as any).user?.id
    logApiRequest(req.method, req.path, userId, duration)
  })
  
  next()
})

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Language Learning Platform API',
}))

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/images', imageRoutes)
app.use('/api/image-texts', imageTextRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/exercises', exerciseRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/languages', languageRoutes)

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler
app.use(notFoundHandler)

// Error handler (must be last)
app.use(errorHandler)

// Start server only if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`Log level: ${process.env.LOG_LEVEL || 'debug'}`)
  })
}

export default app
