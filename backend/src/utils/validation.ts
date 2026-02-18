import { z } from 'zod';

/**
 * Validates data against a Zod schema and returns the parsed result
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated and parsed data
 * @throws ZodError if validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validates data against a Zod schema and returns a safe parse result
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns SafeParseReturnType with success status and data or error
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  return schema.safeParse(data);
}

/**
 * Validates that a language code is supported
 * Supports both ISO 639-1 (e.g., "en") and locale codes (e.g., "en-US")
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'he',
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
  'ru-RU', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ar-SA', 'he-IL'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function isLanguageSupported(languageCode: string): boolean {
  return SUPPORTED_LANGUAGES.includes(languageCode as SupportedLanguage);
}

/**
 * Validates text content according to requirements
 * - Must not be empty
 * - Must not contain only whitespace
 * - Must contain valid Unicode characters
 */
export function validateText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text must not be empty or contain only whitespace' };
  }

  // Check for valid Unicode - this will catch most invalid characters
  try {
    // Try to encode and decode the text
    const encoded = new TextEncoder().encode(text);
    const decoded = new TextDecoder().decode(encoded);
    
    if (decoded !== text) {
      return { valid: false, error: 'Text contains invalid Unicode characters' };
    }
  } catch (error) {
    return { valid: false, error: 'Text contains invalid Unicode characters' };
  }

  return { valid: true };
}

/**
 * Validates image format and size
 */
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE = 10485760; // 10MB in bytes

export function validateImageFormat(file: {
  mimeType: string;
  size: number;
}): { valid: boolean; error?: string } {
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.mimeType as any)) {
    return {
      valid: false,
      error: `Unsupported image format. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}
