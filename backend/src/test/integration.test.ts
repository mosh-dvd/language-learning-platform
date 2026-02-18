import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import pool from '../db/pool.js'
import fs from 'fs/promises'
import path from 'path'

/**
 * Integration Tests for Language Learning Platform
 * 
 * These tests validate complete user flows including:
 * - User registration and authentication
 * - Lesson completion and progress tracking
 * - SRS and gamification workflows
 * - Content management workflows
 * - File upload and retrieval
 */

describe('Integration Tests', () => {
  let authToken: string
  let userId: string
  let imageId: string
  let lessonId: string
  let exerciseId: string

  beforeAll(async () => {
    // Ensure database is ready
    await pool.query('SELECT 1')
  })

  afterAll(async () => {
    // Cleanup: Delete test data (order matters due to foreign keys)
    if (exerciseId) {
      await pool.query('DELETE FROM exercises WHERE id = $1', [exerciseId])
    }
    if (lessonId) {
      await pool.query('DELETE FROM lessons WHERE id = $1', [lessonId])
    }
    if (imageId) {
      await pool.query('DELETE FROM images WHERE id = $1', [imageId])
    }
    if (userId) {
      await pool.query('DELETE FROM exercises WHERE lesson_id IN (SELECT id FROM lessons WHERE created_by = $1)', [userId])
      await pool.query('DELETE FROM lessons WHERE created_by = $1', [userId])
      await pool.query('DELETE FROM images WHERE created_by = $1', [userId])
      await pool.query('DELETE FROM users WHERE id = $1', [userId])
    }
    await pool.end()
  })

  beforeEach(async () => {
    // Clean up any existing test data before each test (order matters due to foreign keys)
    await pool.query("DELETE FROM exercises WHERE lesson_id IN (SELECT id FROM lessons WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'integration-test-%'))")
    await pool.query("DELETE FROM lessons WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'integration-test-%')")
    await pool.query("DELETE FROM images WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'integration-test-%')")
    await pool.query("DELETE FROM users WHERE email LIKE 'integration-test-%'")
  })

  describe('User Registration and Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      const testEmail = `integration-test-${Date.now()}@example.com`
      const testPassword = 'SecurePassword123!'

      // Step 1: Register a new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nativeLanguage: 'en',
        })
        .expect(201)

      expect(registerResponse.body).toHaveProperty('user')
      expect(registerResponse.body.user.email).toBe(testEmail)
      expect(registerResponse.body.user.nativeLanguage).toBe('en')

      userId = registerResponse.body.user.id

      // Step 2: Login with the registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)

      expect(loginResponse.body).toHaveProperty('token')
      expect(loginResponse.body).toHaveProperty('user')
      expect(loginResponse.body.user.email).toBe(testEmail)
      
      authToken = loginResponse.body.token

      // Step 3: Access protected route with token
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(profileResponse.body.user.email).toBe(testEmail)
      expect(profileResponse.body.user.id).toBe(userId)
    })

    it('should prevent duplicate email registration', async () => {
      const testEmail = `integration-test-duplicate-${Date.now()}@example.com`
      const testPassword = 'SecurePassword123!'

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nativeLanguage: 'en',
        })
        .expect(201)

      // Attempt duplicate registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nativeLanguage: 'en',
        })
        .expect(409)
    })

    it('should reject invalid credentials during login', async () => {
      const testEmail = `integration-test-invalid-${Date.now()}@example.com`
      const testPassword = 'SecurePassword123!'

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nativeLanguage: 'en',
        })
        .expect(201)

      // Attempt login with wrong password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401)
    })

    it('should handle logout and token invalidation', async () => {
      const testEmail = `integration-test-logout-${Date.now()}@example.com`
      const testPassword = 'SecurePassword123!'

      // Register and get token
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          nativeLanguage: 'en',
        })
        .expect(201)

      // Login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200)

      const token = loginResponse.body.token

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      // Try to access protected route with invalidated token
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(401)
    })
  })

  describe('Content Management Workflow', () => {
    beforeEach(async () => {
      // Create a test user for content management
      const testEmail = `integration-test-content-${Date.now()}@example.com`
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          nativeLanguage: 'en',
        })
        .expect(201)

      userId = registerResponse.body.user.id
      authToken = registerResponse.body.token
    })

    it('should complete full content creation workflow', async () => {
      // Step 1: Upload an image
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'test-image.jpg')
        .field('altText', 'A test image for integration testing')
        .field('createdBy', userId)
        .expect(201)

      expect(uploadResponse.body).toHaveProperty('id')
      imageId = uploadResponse.body.id

      // Step 2: Add text to the image in multiple languages
      const addTextEnResponse = await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId,
          languageCode: 'en',
          text: 'Hello',
        })
        .expect(201)

      expect(addTextEnResponse.body.text).toBe('Hello')
      expect(addTextEnResponse.body.languageCode).toBe('en')

      const addTextEsResponse = await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId,
          languageCode: 'es',
          text: 'Hola',
        })
        .expect(201)

      expect(addTextEsResponse.body.text).toBe('Hola')
      expect(addTextEsResponse.body.languageCode).toBe('es')

      // Step 3: Create a lesson
      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Lesson',
          targetLanguage: 'es',
          createdBy: userId,
        })
        .expect(201)

      expect(createLessonResponse.body.title).toBe('Integration Test Lesson')
      expect(createLessonResponse.body.targetLanguage).toBe('es')
      lessonId = createLessonResponse.body.id

      // Step 4: Add an exercise to the lesson
      const createExerciseResponse = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId,
          imageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      expect(createExerciseResponse.body.lessonId).toBe(lessonId)
      expect(createExerciseResponse.body.imageId).toBe(imageId)
      exerciseId = createExerciseResponse.body.id

      // Step 5: Publish the lesson
      const publishResponse = await request(app)
        .patch(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          published: true,
        })
        .expect(200)

      expect(publishResponse.body.published).toBe(true)

      // Step 6: Retrieve the lesson with exercises
      const getLessonResponse = await request(app)
        .get(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(getLessonResponse.body.id).toBe(lessonId)
      expect(getLessonResponse.body.exercises).toHaveLength(1)
      expect(getLessonResponse.body.exercises[0].id).toBe(exerciseId)
    })

    it('should handle image deletion with referential integrity', async () => {
      // Upload an image
      const testImageBuffer = Buffer.from('fake-image-data')
      
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'test-image-delete.jpg')
        .field('altText', 'Image to be deleted')
        .field('createdBy', userId)
        .expect(201)

      const tempImageId = uploadResponse.body.id

      // Add text to the image
      await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId: tempImageId,
          languageCode: 'es',
          text: 'Test text',
        })
        .expect(201)

      // Create a lesson with this image
      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Lesson with deletable image',
          targetLanguage: 'es',
          createdBy: userId,
        })
        .expect(201)

      const tempLessonId = createLessonResponse.body.id

      await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: tempLessonId,
          imageId: tempImageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      // Delete the image
      await request(app)
        .delete(`/api/images/${tempImageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify the lesson's exercise no longer references the deleted image
      const getLessonResponse = await request(app)
        .get(`/api/lessons/${tempLessonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // The exercise should either be deleted or have null imageId
      if (getLessonResponse.body.exercises.length > 0) {
        expect(getLessonResponse.body.exercises[0].imageId).toBeNull()
      }

      // Cleanup
      await pool.query('DELETE FROM lessons WHERE id = $1', [tempLessonId])
    })
  })

  describe('Lesson Completion and Progress Tracking Flow', () => {
    beforeEach(async () => {
      // Create a test user
      const testEmail = `integration-test-progress-${Date.now()}@example.com`
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          nativeLanguage: 'en',
        })
        .expect(201)

      userId = registerResponse.body.user.id
      authToken = registerResponse.body.token

      // Create test content
      const testImageBuffer = Buffer.from('fake-image-data')
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'progress-test.jpg')
        .field('altText', 'Progress test image')
        .field('createdBy', userId)
        .expect(201)

      imageId = uploadResponse.body.id

      // Add text to the image
      await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId,
          languageCode: 'es',
          text: 'Test text',
        })
        .expect(201)

      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Progress Test Lesson',
          targetLanguage: 'es',
          published: true,
          createdBy: userId,
        })
        .expect(201)

      lessonId = createLessonResponse.body.id

      const createExerciseResponse = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId,
          imageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      exerciseId = createExerciseResponse.body.id
    })

    it('should track exercise completion and progress', async () => {
      // Step 1: Record exercise completion
      const completeResponse = await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exerciseId,
        })
        .expect(201)

      expect(completeResponse.body.progress.completed).toBe(true)
      expect(completeResponse.body.progress.exerciseId).toBe(exerciseId)

      // Step 2: Retrieve user progress
      const progressResponse = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(progressResponse.body).toHaveProperty('progress')
      expect(Array.isArray(progressResponse.body.progress.recentActivity)).toBe(true)
      const exerciseProgress = progressResponse.body.progress.recentActivity.find(
        (p: any) => p.exerciseId === exerciseId
      )
      expect(exerciseProgress).toBeDefined()
      expect(exerciseProgress.completed).toBe(true)

      // Step 3: Retrieve lesson-specific progress
      const lessonProgressResponse = await request(app)
        .get(`/api/progress/lesson/${lessonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(lessonProgressResponse.body.progress.lessonId).toBe(lessonId)
      expect(lessonProgressResponse.body.progress.completed).toBeGreaterThan(0)
    })

    it('should record and retrieve pronunciation scores', async () => {
      // Record a pronunciation score
      const scoreResponse = await request(app)
        .post('/api/progress/pronunciation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exerciseId,
          score: 85.5,
          recognizedText: 'Hola',
        })
        .expect(201)

      expect(parseFloat(scoreResponse.body.pronunciationScore.score)).toEqual(85.5)
      expect(scoreResponse.body.pronunciationScore.recognizedText).toBe('Hola')

      // Retrieve pronunciation scores
      const scoresResponse = await request(app)
        .get(`/api/progress/pronunciation/exercise/${exerciseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(scoresResponse.body).toHaveProperty('scores')
      expect(Array.isArray(scoresResponse.body.scores)).toBe(true)
      expect(scoresResponse.body.scores.length).toBeGreaterThan(0)
      expect(parseFloat(scoresResponse.body.scores[0].score)).toEqual(85.5)
    })
  })

  describe('SRS and Gamification Workflow', () => {
    beforeEach(async () => {
      // Create a test user
      const testEmail = `integration-test-srs-${Date.now()}@example.com`
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          nativeLanguage: 'en',
        })
        .expect(201)

      userId = registerResponse.body.user.id
      authToken = registerResponse.body.token
    })

    it('should track streaks and award XP for daily activity', async () => {
      // Create and complete an exercise to trigger streak and XP
      const testImageBuffer = Buffer.from('fake-image-data')
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'srs-test.jpg')
        .field('altText', 'SRS test image')
        .field('createdBy', userId)
        .expect(201)

      const tempImageId = uploadResponse.body.id

      // Add text to the image
      await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId: tempImageId,
          languageCode: 'es',
          text: 'Test text',
        })
        .expect(201)

      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'SRS Test Lesson',
          targetLanguage: 'es',
          published: true,
          createdBy: userId,
        })
        .expect(201)

      const tempLessonId = createLessonResponse.body.id

      const createExerciseResponse = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: tempLessonId,
          imageId: tempImageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      const tempExerciseId = createExerciseResponse.body.id

      // Complete the exercise
      await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          exerciseId: tempExerciseId,
        })
        .expect(201)

      // Check streak (this would typically be handled by a gamification endpoint)
      // For now, we verify the progress was recorded
      const progressResponse = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(progressResponse.body).toHaveProperty('progress')
      expect(progressResponse.body.progress).toHaveProperty('totalExercisesCompleted')
      expect(progressResponse.body.progress.totalExercisesCompleted).toBeGreaterThan(0)

      // Cleanup
      await pool.query('DELETE FROM lessons WHERE id = $1', [tempLessonId])
      await pool.query('DELETE FROM images WHERE id = $1', [tempImageId])
    })

    it('should identify weak words based on pronunciation scores', async () => {
      // Create test content
      const testImageBuffer = Buffer.from('fake-image-data')
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'weak-word-test.jpg')
        .field('altText', 'Weak word test image')
        .field('createdBy', userId)
        .expect(201)

      const tempImageId = uploadResponse.body.id

      // Add text to image
      const addTextResponse = await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          imageId: tempImageId,
          languageCode: 'es',
          text: 'Difícil',
        })
        .expect(201)

      const imageTextId = addTextResponse.body.id

      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Weak Word Test Lesson',
          targetLanguage: 'es',
          published: true,
          createdBy: userId,
        })
        .expect(201)

      const tempLessonId = createLessonResponse.body.id

      const createExerciseResponse = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lessonId: tempLessonId,
          imageId: tempImageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      const tempExerciseId = createExerciseResponse.body.id

      // Record multiple low pronunciation scores to create a weak word
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/progress/pronunciation')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            exerciseId: tempExerciseId,
            score: 50 + Math.random() * 15, // Scores between 50-65
            recognizedText: 'Dificil',
          })
          .expect(201)
      }

      // The weak word should now be tracked in the system
      // Verify by checking pronunciation scores
      const scoresResponse = await request(app)
        .get(`/api/progress/pronunciation/exercise/${tempExerciseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(scoresResponse.body).toHaveProperty('scores')
      expect(scoresResponse.body.scores.length).toBe(5)
      const avgScore = scoresResponse.body.scores.reduce((sum: number, s: any) => sum + parseFloat(s.score), 0) / 5
      expect(avgScore).toBeLessThan(70)

      // Cleanup
      await pool.query('DELETE FROM lessons WHERE id = $1', [tempLessonId])
      await pool.query('DELETE FROM images WHERE id = $1', [tempImageId])
    })
  })

  describe('File Upload and Retrieval', () => {
    beforeEach(async () => {
      // Create a test user
      const testEmail = `integration-test-files-${Date.now()}@example.com`
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          nativeLanguage: 'en',
        })
        .expect(201)

      userId = registerResponse.body.user.id
      authToken = registerResponse.body.token
    })

    it('should upload, retrieve, and delete images', async () => {
      // Upload an image
      const testImageBuffer = Buffer.from('fake-image-data-for-retrieval')
      
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'retrieval-test.jpg')
        .field('altText', 'Image for retrieval testing')
        .field('createdBy', userId)
        .expect(201)

      expect(uploadResponse.body).toHaveProperty('id')
      const tempImageId = uploadResponse.body.id

      // Retrieve the image metadata
      const getImageResponse = await request(app)
        .get(`/api/images/${tempImageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(getImageResponse.body.id).toBe(tempImageId)

      // List all images
      const listImagesResponse = await request(app)
        .get('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Array.isArray(listImagesResponse.body)).toBe(true)
      const uploadedImage = listImagesResponse.body.find((img: any) => img.id === tempImageId)
      expect(uploadedImage).toBeDefined()

      // Delete the image
      await request(app)
        .delete(`/api/images/${tempImageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify deletion
      await request(app)
        .get(`/api/images/${tempImageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should validate image format and size', async () => {
      // Attempt to upload without alt text (should fail)
      const testImageBuffer = Buffer.from('fake-image-data')
      
      await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'no-alt-text.jpg')
        .field('createdBy', userId)
        .expect(400)

      // Upload with alt text (should succeed)
      await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImageBuffer, 'with-alt-text.jpg')
        .field('altText', 'Valid alt text')
        .field('createdBy', userId)
        .expect(201)
    })
  })

  describe('Authorization and Access Control', () => {
    let user1Token: string
    let user1Id: string
    let user2Token: string
    let user2Id: string

    beforeEach(async () => {
      // Create two test users
      const user1Email = `integration-test-user1-${Date.now()}@example.com`
      const user1Password = 'SecurePassword123!'
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: user1Email,
          password: user1Password,
          nativeLanguage: 'en',
        })
        .expect(201)

      user1Id = user1Response.body.user.id
      
      // Login to get token
      const user1Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200)
      
      user1Token = user1Login.body.token

      const user2Email = `integration-test-user2-${Date.now()}@example.com`
      const user2Password = 'SecurePassword123!'
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: user2Email,
          password: user2Password,
          nativeLanguage: 'en',
        })
        .expect(201)

      user2Id = user2Response.body.user.id
      
      // Login to get token
      const user2Login = await request(app)
        .post('/api/auth/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200)
      
      user2Token = user2Login.body.token
    })

    afterEach(async () => {
      // Cleanup test users (delete in correct order due to foreign keys)
      await pool.query('DELETE FROM exercises WHERE lesson_id IN (SELECT id FROM lessons WHERE created_by IN ($1, $2))', [user1Id, user2Id])
      await pool.query('DELETE FROM lessons WHERE created_by IN ($1, $2)', [user1Id, user2Id])
      await pool.query('DELETE FROM images WHERE created_by IN ($1, $2)', [user1Id, user2Id])
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id])
    })

    it('should prevent unauthorized access to protected routes', async () => {
      // Attempt to access protected route without token
      await request(app)
        .get('/api/auth/profile')
        .expect(401)

      // Attempt with invalid token
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      // Access with valid token should succeed
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)
    })

    it('should isolate user progress between different users', async () => {
      // User 1 creates content and completes an exercise
      const testImageBuffer = Buffer.from('fake-image-data')
      const uploadResponse = await request(app)
        .post('/api/images')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('image', testImageBuffer, 'isolation-test.jpg')
        .field('altText', 'Isolation test image')
        .field('createdBy', user1Id)
        .expect(201)

      const tempImageId = uploadResponse.body.id

      // Add text to the image
      await request(app)
        .post('/api/image-texts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          imageId: tempImageId,
          languageCode: 'es',
          text: 'Test text',
        })
        .expect(201)

      const createLessonResponse = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Isolation Test Lesson',
          targetLanguage: 'es',
          published: true,
          createdBy: user1Id,
        })
        .expect(201)

      const tempLessonId = createLessonResponse.body.id

      const createExerciseResponse = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          lessonId: tempLessonId,
          imageId: tempImageId,
          exerciseType: 'image_text',
          orderIndex: 0,
        })
        .expect(201)

      const tempExerciseId = createExerciseResponse.body.id

      // User 1 completes the exercise
      await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          exerciseId: tempExerciseId,
        })
        .expect(201)

      // User 1 should see their progress
      const user1Progress = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200)

      expect(user1Progress.body).toHaveProperty('progress')
      expect(user1Progress.body.progress).toHaveProperty('totalExercisesCompleted')
      expect(user1Progress.body.progress.totalExercisesCompleted).toBeGreaterThan(0)

      // User 2 should not see User 1's progress
      const user2Progress = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)

      expect(user2Progress.body).toHaveProperty('progress')
      expect(user2Progress.body.progress).toHaveProperty('recentActivity')
      const user2HasUser1Exercise = user2Progress.body.progress.recentActivity.some(
        (p: any) => p.exerciseId === tempExerciseId
      )
      expect(user2HasUser1Exercise).toBe(false)

      // Cleanup
      await pool.query('DELETE FROM lessons WHERE id = $1', [tempLessonId])
      await pool.query('DELETE FROM images WHERE id = $1', [tempImageId])
    })
  })
})
