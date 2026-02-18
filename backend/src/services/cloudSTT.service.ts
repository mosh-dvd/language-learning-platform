import logger, { logSTTUsage } from '../utils/logger.js';

export interface STTRequest {
  audioData: Buffer | string; // Audio data as buffer or base64 string
  languageCode: string;
  encoding?: 'LINEAR16' | 'FLAC' | 'MULAW' | 'AMR' | 'AMR_WB' | 'OGG_OPUS' | 'WEBM_OPUS';
  sampleRateHertz?: number;
}

export interface STTResponse {
  transcript: string;
  confidence: number;
  provider: 'web_speech_api' | 'google_cloud' | 'aws_transcribe' | 'azure_speech';
}

export interface CloudSTTConfig {
  provider: 'google_cloud' | 'aws_transcribe' | 'azure_speech';
  apiKey?: string;
  region?: string;
  endpoint?: string;
}

/**
 * Cloud STT Service that provides fallback when Web Speech API is unavailable or low quality
 * This is a base implementation that can be extended with actual cloud provider integrations
 */
export class CloudSTTService {
  constructor(private config?: CloudSTTConfig) {}

  /**
   * Detect if Web Speech API is available and of sufficient quality
   */
  isWebSpeechAPIAvailable(): boolean {
    // In a real implementation, this would check browser capabilities
    // For now, we assume it's available by default
    return true;
  }

  /**
   * Transcribe audio with automatic fallback to cloud services
   */
  async transcribe(request: STTRequest, userId?: string): Promise<STTResponse> {
    const provider = this.selectProvider();

    try {
      const result = await this.transcribeWithProvider(request, provider);
      
      // Log STT usage
      logSTTUsage(result.transcript, request.languageCode, result.provider, result.confidence, userId);
      
      return result;
    } catch (error) {
      logger.error(`STT transcription failed with ${provider}:`, error);

      // Try fallback provider if available
      if (provider !== 'web_speech_api') {
        logger.info('Attempting fallback to web_speech_api');
        const result = await this.transcribeWithProvider(request, 'web_speech_api');
        
        // Log STT usage for fallback
        logSTTUsage(result.transcript, request.languageCode, result.provider, result.confidence, userId);
        
        return result;
      }

      throw error;
    }
  }

  /**
   * Select the best available provider based on configuration and availability
   */
  private selectProvider(): STTResponse['provider'] {
    if (this.config?.provider) {
      return this.config.provider;
    }

    // Default to web_speech_api if no cloud provider is configured
    return 'web_speech_api';
  }

  /**
   * Transcribe audio using the specified provider
   * This is a placeholder that should be implemented with actual cloud service calls
   */
  private async transcribeWithProvider(
    request: STTRequest,
    provider: STTResponse['provider']
  ): Promise<STTResponse> {
    // In a real implementation, this would:
    // 1. Call the appropriate cloud service API (Google Cloud STT, AWS Transcribe, etc.)
    // 2. Parse the response and extract the transcript and confidence
    // 3. Return the structured response

    // For now, return a placeholder response
    return {
      transcript: 'Placeholder transcript',
      confidence: 0.95,
      provider,
    };
  }

  /**
   * Handle API errors and implement retry logic with exponential backoff
   */
  async transcribeWithRetry(
    request: STTRequest,
    maxRetries: number = 3
  ): Promise<STTResponse> {
    let lastError: Error | null = null;
    let delay = 1000; // Start with 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.transcribe(request);
      } catch (error) {
        lastError = error as Error;
        logger.error(`STT transcription attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          // Wait before retrying with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }

    throw new Error(
      `Failed to transcribe audio after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Check rate limiting status for the configured provider
   */
  async checkRateLimit(): Promise<{ remaining: number; resetAt: Date }> {
    // Placeholder implementation
    return {
      remaining: 1000,
      resetAt: new Date(Date.now() + 3600000), // 1 hour from now
    };
  }

  /**
   * Validate audio format and quality before transcription
   */
  validateAudioRequest(request: STTRequest): { valid: boolean; error?: string } {
    if (!request.audioData) {
      return { valid: false, error: 'Audio data is required' };
    }

    if (!request.languageCode) {
      return { valid: false, error: 'Language code is required' };
    }

    // Check if audio data is valid
    if (typeof request.audioData === 'string') {
      // Validate base64 string - check if it matches base64 pattern
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(request.audioData)) {
        return { valid: false, error: 'Invalid base64 audio data' };
      }
      
      try {
        const buffer = Buffer.from(request.audioData, 'base64');
        // Verify the decoded buffer is not empty
        if (buffer.length === 0) {
          return { valid: false, error: 'Invalid base64 audio data' };
        }
      } catch (error) {
        return { valid: false, error: 'Invalid base64 audio data' };
      }
    }

    return { valid: true };
  }
}
