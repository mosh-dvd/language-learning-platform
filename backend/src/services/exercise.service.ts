import {
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  ReorderExercisesInput,
  CreateExerciseSchema,
  UpdateExerciseSchema,
  ReorderExercisesSchema,
  ExerciseType,
  MatchingPairsMetadataSchema,
  FillInBlankMetadataSchema,
  ListeningComprehensionMetadataSchema,
  ImageTextMetadataSchema,
} from '../models/exercise.model.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { ImageRepository } from '../repositories/image.repository.js';
import { ImageTextRepository } from '../repositories/imageText.repository.js';
import pool from '../db/pool.js';

export class ExerciseService {
  private exerciseRepository: ExerciseRepository;
  private imageRepository: ImageRepository;
  private imageTextRepository: ImageTextRepository;

  constructor() {
    this.exerciseRepository = new ExerciseRepository(pool);
    this.imageRepository = new ImageRepository(pool);
    this.imageTextRepository = new ImageTextRepository(pool);
  }

  async createExercise(input: CreateExerciseInput): Promise<Exercise> {
    // Validate input
    const validated = CreateExerciseSchema.parse(input);

    // Validate exercise type metadata
    await this.validateExerciseContent(validated.exerciseType, validated.imageId, validated.metadata);

    // Create exercise
    const exercise = await this.exerciseRepository.create(validated);
    return exercise;
  }

  async getExercise(id: string): Promise<Exercise | null> {
    return this.exerciseRepository.findById(id);
  }

  async getExercisesByLesson(lessonId: string): Promise<Exercise[]> {
    return this.exerciseRepository.findByLessonId(lessonId);
  }

  async updateExercise(id: string, input: UpdateExerciseInput): Promise<Exercise | null> {
    // Validate input
    const validated = UpdateExerciseSchema.parse(input);

    // If updating exercise type or metadata, validate content
    if (validated.exerciseType || validated.metadata) {
      const existing = await this.exerciseRepository.findById(id);
      if (!existing) {
        return null;
      }

      const exerciseType = validated.exerciseType || existing.exerciseType;
      const imageId = validated.imageId || existing.imageId;
      const metadata = validated.metadata || existing.metadata;

      await this.validateExerciseContent(exerciseType, imageId, metadata);
    }

    // Update exercise
    return this.exerciseRepository.update(id, validated);
  }

  async deleteExercise(id: string): Promise<boolean> {
    return this.exerciseRepository.delete(id);
  }

  async reorderExercises(lessonId: string, input: ReorderExercisesInput): Promise<Exercise[]> {
    // Validate input
    const validated = ReorderExercisesSchema.parse(input);

    // Get all exercises for the lesson
    const exercises = await this.exerciseRepository.findByLessonId(lessonId);

    // Verify all exercise IDs belong to this lesson
    const exerciseIds = exercises.map(e => e.id);
    for (const id of validated.exerciseIds) {
      if (!exerciseIds.includes(id)) {
        throw new Error(`Exercise ${id} does not belong to lesson ${lessonId}`);
      }
    }

    // Update order indices
    for (let i = 0; i < validated.exerciseIds.length; i++) {
      await this.exerciseRepository.updateOrderIndex(validated.exerciseIds[i], i);
    }

    // Return updated exercises
    return this.exerciseRepository.findByLessonId(lessonId);
  }

  private async validateExerciseContent(
    exerciseType: ExerciseType,
    imageId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Validate that image exists
    const image = await this.imageRepository.findById(imageId);
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }

    // Validate that image has associated text
    const imageTexts = await this.imageTextRepository.list({ imageId });
    if (imageTexts.length === 0) {
      throw new Error(`Image ${imageId} has no associated text`);
    }

    // Validate metadata based on exercise type
    switch (exerciseType) {
      case 'image_text':
        ImageTextMetadataSchema.parse(metadata || {});
        break;

      case 'matching_pairs':
        if (!metadata) {
          throw new Error('Matching pairs exercise requires metadata');
        }
        const matchingMetadata = MatchingPairsMetadataSchema.parse(metadata);
        
        // Validate that all images exist
        for (const pair of matchingMetadata.pairs) {
          const pairImage = await this.imageRepository.findById(pair.imageId);
          if (!pairImage) {
            throw new Error(`Image ${pair.imageId} not found in matching pairs`);
          }
          
          // Note: textId validation would require knowing the language context
          // This should be validated at a higher level with language context
        }
        break;

      case 'fill_in_blank':
        if (!metadata) {
          throw new Error('Fill in blank exercise requires metadata');
        }
        const fillInBlankMetadata = FillInBlankMetadataSchema.parse(metadata);
        
        // Validate that blank index is within sentence bounds
        if (fillInBlankMetadata.blankIndex >= fillInBlankMetadata.sentence.split(' ').length) {
          throw new Error('Blank index is out of bounds for sentence');
        }
        break;

      case 'listening_comprehension':
        if (!metadata) {
          throw new Error('Listening comprehension exercise requires metadata');
        }
        const listeningMetadata = ListeningComprehensionMetadataSchema.parse(metadata);
        
        // Note: audioTextId validation would require knowing the language context
        // This should be validated at a higher level with language context
        
        // Validate that all image options exist
        for (const optionImageId of listeningMetadata.imageOptions) {
          const optionImage = await this.imageRepository.findById(optionImageId);
          if (!optionImage) {
            throw new Error(`Image option ${optionImageId} not found`);
          }
        }
        
        // Validate that correct image index is within bounds
        if (listeningMetadata.correctImageIndex >= listeningMetadata.imageOptions.length) {
          throw new Error('Correct image index is out of bounds');
        }
        break;

      default:
        throw new Error(`Unknown exercise type: ${exerciseType}`);
    }
  }
}

// Export singleton instance
export const exerciseService = new ExerciseService();
