import {
  ImageText,
  CreateImageTextInput,
  UpdateImageTextInput,
  CreateImageTextSchema,
  UpdateImageTextSchema,
} from '../models/imageText.model.js';
import {
  ImageTextRepository,
  imageTextRepository,
} from '../repositories/imageText.repository.js';
import { imageRepository, ImageRepository } from '../repositories/image.repository.js';

export class ImageTextService {
  constructor(
    private imageTextRepo: ImageTextRepository = imageTextRepository,
    private imageRepo: ImageRepository = imageRepository
  ) {}

  /**
   * Add text to an image in a specific language
   * Creates a new version if text already exists for this language
   */
  async addText(input: CreateImageTextInput): Promise<ImageText> {
    // Validate input
    const validated = CreateImageTextSchema.parse(input);

    // Verify image exists
    const image = await this.imageRepo.findById(validated.imageId);
    if (!image) {
      throw new Error(`Image with ID ${validated.imageId} not found`);
    }

    // Create the text entry (repository handles versioning)
    return await this.imageTextRepo.create(validated);
  }

  /**
   * Update text for an image in a specific language
   * Creates a new version with the updated text
   */
  async updateText(
    imageId: string,
    languageCode: string,
    input: UpdateImageTextInput
  ): Promise<ImageText> {
    // Validate input
    const validated = UpdateImageTextSchema.parse(input);

    // Verify image exists
    const image = await this.imageRepo.findById(imageId);
    if (!image) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    // Check if text exists for this language
    const existingText = await this.imageTextRepo.findLatestByImageAndLanguage(
      imageId,
      languageCode
    );

    if (!existingText) {
      throw new Error(
        `No text found for image ${imageId} in language ${languageCode}`
      );
    }

    // Create new version with updated text
    return await this.imageTextRepo.create({
      imageId,
      languageCode,
      text: validated.text,
    });
  }

  /**
   * Get the latest text for an image in a specific language
   */
  async getTextByLanguage(
    imageId: string,
    languageCode: string
  ): Promise<ImageText | null> {
    return await this.imageTextRepo.findLatestByImageAndLanguage(
      imageId,
      languageCode
    );
  }

  /**
   * Get all available languages for an image
   */
  async getAvailableLanguages(imageId: string): Promise<string[]> {
    return await this.imageTextRepo.findLanguagesByImage(imageId);
  }

  /**
   * Get version history for an image in a specific language
   */
  async getVersionHistory(
    imageId: string,
    languageCode: string
  ): Promise<ImageText[]> {
    return await this.imageTextRepo.findVersionHistory(imageId, languageCode);
  }

  /**
   * Get a specific version of text
   */
  async getTextVersion(
    imageId: string,
    languageCode: string,
    version: number
  ): Promise<ImageText | null> {
    return await this.imageTextRepo.findByImageLanguageAndVersion(
      imageId,
      languageCode,
      version
    );
  }

  /**
   * Get all texts for an image (latest version of each language)
   */
  async getAllTextsForImage(imageId: string): Promise<ImageText[]> {
    const languages = await this.imageTextRepo.findLanguagesByImage(imageId);
    const texts: ImageText[] = [];

    for (const lang of languages) {
      const text = await this.imageTextRepo.findLatestByImageAndLanguage(
        imageId,
        lang
      );
      if (text) {
        texts.push(text);
      }
    }

    return texts;
  }
}

// Export singleton instance
export const imageTextService = new ImageTextService();
