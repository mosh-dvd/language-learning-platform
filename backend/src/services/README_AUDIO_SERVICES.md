# Audio Caching and Cloud TTS/STT Services

This document describes the audio caching and cloud TTS/STT fallback services implemented for the language learning platform.

## Overview

The platform provides robust audio generation and speech recognition capabilities with:
- **Audio caching** to minimize redundant TTS generation and improve performance
- **Cloud TTS/STT fallback** to ensure consistent quality when Web Speech API is unavailable or low quality
- **Automatic retry logic** with exponential backoff for handling transient failures
- **Rate limiting awareness** to prevent exceeding cloud service quotas

## Components

### 1. Audio Cache Service (`audioCache.service.ts`)

Manages caching of generated audio files to improve performance and reduce costs.

**Key Features:**
- SHA-256 hash generation for text + language code combinations
- Cache lookup before generating new audio
- Automatic access tracking (count and timestamp)
- TTL-based cleanup for old cache entries (default: 90 days)

**Usage Example:**
```typescript
const audioCacheService = new AudioCacheService(cachedAudioRepository);

// Generate hash
const hash = audioCacheService.generateHash('Hello world', 'en-US');

// Lookup cached audio
const cached = await audioCacheService.lookup('Hello world', 'en-US', 'web_speech_api');

// Store new audio
await audioCacheService.store('Hello world', 'en-US', 'https://example.com/audio.mp3', {
  provider: 'google_cloud',
  imageTextId: 'optional-image-text-id'
});

// Cleanup old entries
const deletedCount = await audioCacheService.cleanup(90);
```

### 2. Cloud TTS Service (`cloudTTS.service.ts`)

Provides text-to-speech generation with automatic fallback to cloud services.

**Supported Providers:**
- Web Speech API (browser-based, free)
- Google Cloud TTS
- AWS Polly
- Azure Speech

**Key Features:**
- Automatic cache checking before generation
- Provider selection based on configuration
- Retry logic with exponential backoff
- Rate limiting awareness
- Error handling for API failures

**Usage Example:**
```typescript
const config = {
  provider: 'google_cloud',
  apiKey: 'your-api-key',
  region: 'us-east-1'
};

const cloudTTSService = new CloudTTSService(audioCacheService, config);

// Generate audio (checks cache first)
const result = await cloudTTSService.generateAudio({
  text: 'Hello world',
  languageCode: 'en-US',
  imageTextId: 'optional-id'
});

// With retry logic
const resultWithRetry = await cloudTTSService.generateWithRetry({
  text: 'Hello world',
  languageCode: 'en-US'
}, 3); // max 3 retries

// Check rate limits
const rateLimit = await cloudTTSService.checkRateLimit();
console.log(`Remaining: ${rateLimit.remaining}, Resets at: ${rateLimit.resetAt}`);
```

### 3. Cloud STT Service (`cloudSTT.service.ts`)

Provides speech-to-text transcription with automatic fallback to cloud services.

**Supported Providers:**
- Web Speech API (browser-based, free)
- Google Cloud STT
- AWS Transcribe
- Azure Speech

**Key Features:**
- Audio format validation
- Provider selection based on configuration
- Retry logic with exponential backoff
- Automatic fallback to Web Speech API on failure
- Support for multiple audio encodings

**Usage Example:**
```typescript
const config = {
  provider: 'google_cloud',
  apiKey: 'your-api-key',
  region: 'us-east-1'
};

const cloudSTTService = new CloudSTTService(config);

// Validate request
const validation = cloudSTTService.validateAudioRequest({
  audioData: audioBuffer,
  languageCode: 'en-US'
});

if (!validation.valid) {
  console.error(validation.error);
  return;
}

// Transcribe audio
const result = await cloudSTTService.transcribe({
  audioData: audioBuffer,
  languageCode: 'en-US',
  encoding: 'LINEAR16',
  sampleRateHertz: 16000
});

console.log(`Transcript: ${result.transcript}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Provider: ${result.provider}`);

// With retry logic
const resultWithRetry = await cloudSTTService.transcribeWithRetry({
  audioData: audioBuffer,
  languageCode: 'en-US'
}, 3); // max 3 retries
```

## Database Schema

### cached_audio Table

```sql
CREATE TABLE cached_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_text_id UUID REFERENCES image_texts(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  UNIQUE(text_hash, language_code, provider)
);
```

**Indexes:**
- `idx_cached_audio_text_hash` on (text_hash, language_code)
- `idx_cached_audio_last_accessed` on (last_accessed)
- `idx_cached_audio_image_text_id` on (image_text_id)

## Implementation Notes

### Cache Strategy

1. **Hash Generation**: SHA-256 hash of `text:languageCode` ensures consistent cache keys
2. **Provider-Specific Caching**: Same text can be cached for different providers
3. **Access Tracking**: Automatically updates `last_accessed` and `access_count` on cache hits
4. **TTL-Based Cleanup**: Removes entries not accessed in 90 days (configurable)

### Error Handling

Both TTS and STT services implement:
- **Exponential Backoff**: Retry delays double with each attempt (1s, 2s, 4s, etc.)
- **Maximum Retries**: Configurable retry limit (default: 3)
- **Graceful Degradation**: STT falls back to Web Speech API on cloud provider failure
- **Detailed Error Messages**: Include attempt count and original error for debugging

### Cloud Provider Integration

The current implementation provides a framework for cloud provider integration. To add actual cloud service support:

1. **Install Provider SDK**:
   ```bash
   npm install @google-cloud/text-to-speech
   npm install @google-cloud/speech
   # or
   npm install @aws-sdk/client-polly
   npm install @aws-sdk/client-transcribe
   ```

2. **Implement Provider-Specific Logic** in `generateWithProvider()` and `transcribeWithProvider()`:
   ```typescript
   private async generateWithProvider(
     text: string,
     languageCode: string,
     provider: AudioProvider
   ): Promise<string> {
     switch (provider) {
       case 'google_cloud':
         return await this.generateWithGoogleCloud(text, languageCode);
       case 'aws_polly':
         return await this.generateWithAWSPolly(text, languageCode);
       // ... other providers
     }
   }
   ```

3. **Upload to Storage**: Generated audio should be uploaded to S3 or compatible storage and return the public URL

### Performance Considerations

- **Cache First**: Always check cache before generating new audio
- **Async Access Updates**: Cache access info updates happen asynchronously to avoid blocking
- **Batch Cleanup**: Run cleanup jobs during off-peak hours
- **CDN Integration**: Serve cached audio through CDN for better performance

### Security Considerations

- **API Key Management**: Store cloud provider API keys in environment variables
- **Rate Limiting**: Monitor and respect cloud provider rate limits
- **Access Control**: Ensure audio URLs are properly secured (signed URLs for private content)
- **Input Validation**: Validate all audio requests before processing

## Testing

All services include comprehensive unit tests:
- `audioCache.service.test.ts`: 10 tests covering hash generation, lookup, storage, and cleanup
- `cloudTTS.service.test.ts`: 9 tests covering audio generation, caching, retry logic, and rate limiting
- `cloudSTT.service.test.ts`: 11 tests covering transcription, validation, retry logic, and error handling

Run tests with:
```bash
npm test -- audioCache.service.test.ts cloudTTS.service.test.ts cloudSTT.service.test.ts
```

## Future Enhancements

1. **Pre-generation**: Pre-generate audio for common phrases and lesson content
2. **Quality Detection**: Implement actual Web Speech API quality detection
3. **Cost Optimization**: Track and optimize cloud service usage
4. **Multi-Region Support**: Deploy audio storage across multiple regions
5. **Compression**: Implement audio compression to reduce storage costs
6. **Analytics**: Track cache hit rates and provider usage statistics
