/**
 * ImageCard Component
 * Displays an image with text overlay and audio playback functionality
 * Implements Requirements: 3.3, 3.4, 15.6
 */

import { useState, useCallback } from 'react';
import { ttsService } from '../services/tts.service';

export interface ImageCardProps {
  imageUrl: string;
  text: string;
  languageCode: string;
  altText?: string;
  onSpeak?: () => void;
  className?: string;
}

type PlaybackState = 'ready' | 'playing' | 'error';

export const ImageCard: React.FC<ImageCardProps> = ({
  imageUrl,
  text,
  languageCode,
  altText,
  onSpeak,
  className = '',
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('ready');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSpeak = useCallback(async () => {
    if (playbackState === 'playing') {
      return;
    }

    try {
      setPlaybackState('playing');
      setErrorMessage('');
      
      if (onSpeak) {
        onSpeak();
      }

      await ttsService.speak(text, { languageCode });
      
      setPlaybackState('ready');
    } catch (error) {
      setPlaybackState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to play audio');
      
      // Reset to ready state after showing error
      setTimeout(() => {
        setPlaybackState('ready');
        setErrorMessage('');
      }, 3000);
    }
  }, [text, languageCode, playbackState, onSpeak]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-lg bg-gray-100 ${className}`}
      role="article"
      aria-label={`Image card: ${text}`}
    >
      {/* Image */}
      <div className="relative w-full aspect-video bg-gray-200">
        {!imageLoaded && !imageError && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <div className="animate-pulse text-gray-400">Loading image...</div>
          </div>
        )}
        
        {imageError && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-gray-300"
            role="alert"
          >
            <div className="text-center text-gray-600">
              <svg 
                className="w-12 h-12 mx-auto mb-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <p>Failed to load image</p>
            </div>
          </div>
        )}
        
        <img
          src={imageUrl}
          alt={altText || text}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>

      {/* Text Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4 lg:p-6">
        <p className="text-white text-base sm:text-xl lg:text-2xl font-semibold text-center">
          {text}
        </p>
      </div>

      {/* Audio Playback Button */}
      <button
        onClick={handleSpeak}
        disabled={playbackState === 'playing' || imageError}
        className={`absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 rounded-full shadow-lg transition-all duration-200 focus:ring-2 ${
          playbackState === 'playing'
            ? 'bg-blue-600 animate-pulse'
            : playbackState === 'error'
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-white hover:bg-gray-100'
        }`}
        aria-label={
          playbackState === 'playing'
            ? 'Audio playing'
            : playbackState === 'error'
            ? 'Audio error'
            : 'Play audio'
        }
        aria-pressed={playbackState === 'playing'}
        aria-live="polite"
        aria-describedby={errorMessage ? 'audio-error' : undefined}
        title={
          playbackState === 'playing'
            ? `Playing audio for: ${text}`
            : playbackState === 'error'
            ? 'Click to retry'
            : `Play audio for: ${text}`
        }
      >
        {playbackState === 'playing' ? (
          // Playing state - animated sound waves
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ) : playbackState === 'error' ? (
          // Error state
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          // Ready state - speaker icon
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        )}
      </button>

      {/* Visual indicator for audio (accessibility) */}
      {playbackState === 'playing' && (
        <div 
          className="absolute top-2 left-2 sm:top-4 sm:left-4 flex space-x-1"
          role="status"
          aria-label="Audio is playing"
        >
          <div className="w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div 
          id="audio-error"
          className="absolute bottom-14 sm:bottom-16 left-2 right-2 sm:left-4 sm:right-4 bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-2 rounded text-xs sm:text-sm"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};
