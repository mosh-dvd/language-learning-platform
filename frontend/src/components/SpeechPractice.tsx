/**
 * SpeechPractice Component
 * Handles microphone input and pronunciation validation
 * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6
 */

import { useState, useEffect, useCallback } from 'react';
import { sttService, STTResult } from '../services/stt.service';
import { pronunciationValidator } from '../services/pronunciationValidator.service';

export interface SpeechPracticeProps {
  expectedText: string;
  languageCode: string;
  onScore: (score: number) => void;
  threshold?: number;
  className?: string;
}

export interface SpeechPracticeState {
  isListening: boolean;
  recognizedText: string;
  score: number | null;
  error: string | null;
  permissionDenied: boolean;
}

export function SpeechPractice({
  expectedText,
  languageCode,
  onScore,
  threshold = 70,
  className = ''
}: SpeechPracticeProps) {
  const [state, setState] = useState<SpeechPracticeState>({
    isListening: false,
    recognizedText: '',
    score: null,
    error: null,
    permissionDenied: false
  });

  const isSupported = sttService.isSupported();

  // Handle STT results
  const handleResult = useCallback((result: STTResult) => {
    if (result.isFinal) {
      const score = pronunciationValidator.calculateScore(expectedText, result.transcript);
      
      setState(prev => ({
        ...prev,
        recognizedText: result.transcript,
        score,
        isListening: false
      }));

      onScore(score);
    } else {
      // Show interim results
      setState(prev => ({
        ...prev,
        recognizedText: result.transcript
      }));
    }
  }, [expectedText, onScore]);

  // Handle STT errors
  const handleError = useCallback((error: Error) => {
    const isPermissionError = error.message.includes('permission') || 
                              error.message.includes('not-allowed') ||
                              error.message.includes('microphone access was denied');
    
    setState(prev => ({
      ...prev,
      error: error.message,
      isListening: false,
      permissionDenied: isPermissionError
    }));
  }, []);

  // Setup STT callbacks
  useEffect(() => {
    const unsubscribeResult = sttService.onResult(handleResult);
    const unsubscribeError = sttService.onError(handleError);

    return () => {
      unsubscribeResult();
      unsubscribeError();
      sttService.stopListening();
    };
  }, [handleResult, handleError]);

  // Start listening
  const startListening = async () => {
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Speech recognition is not supported in this browser'
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isListening: true,
        recognizedText: '',
        score: null,
        error: null,
        permissionDenied: false
      }));

      await sttService.startListening({
        languageCode,
        continuous: false,
        interimResults: true,
        maxAlternatives: 1
      });
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to start listening'));
    }
  };

  // Stop listening
  const stopListening = () => {
    sttService.stopListening();
    setState(prev => ({
      ...prev,
      isListening: false
    }));
  };

  // Retry pronunciation
  const retry = () => {
    setState({
      isListening: false,
      recognizedText: '',
      score: null,
      error: null,
      permissionDenied: false
    });
  };

  // Get feedback based on score
  const getFeedback = () => {
    if (state.score === null) return null;

    if (state.score >= threshold) {
      return {
        type: 'positive' as const,
        message: state.score >= 90 ? 'Excellent pronunciation!' : 'Good job!',
        color: 'text-green-600'
      };
    } else {
      return {
        type: 'negative' as const,
        message: 'Try again to improve your pronunciation',
        color: 'text-yellow-600'
      };
    }
  };

  const feedback = getFeedback();

  if (!isSupported) {
    return (
      <div className={`speech-practice ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Speech recognition is not supported in your browser. 
            Please use Chrome, Edge, or Safari for pronunciation practice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`speech-practice ${className}`}>
      <div className="space-y-4">
        {/* Expected text display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Practice saying:</p>
          <p className="text-lg font-medium text-gray-900">{expectedText}</p>
        </div>

        {/* Microphone button */}
        <div className="flex justify-center">
          <button
            onClick={state.isListening ? stopListening : startListening}
            disabled={state.permissionDenied}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${state.isListening 
                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
              }
              ${state.permissionDenied ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={state.isListening ? 'Stop recording' : 'Start recording'}
            aria-pressed={state.isListening}
          >
            {state.isListening ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="6" width="8" height="8" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Status text */}
        <div className="text-center">
          {state.isListening && (
            <p className="text-sm text-gray-600">Listening...</p>
          )}
          {!state.isListening && state.score === null && !state.error && (
            <p className="text-sm text-gray-600">Click the microphone to start</p>
          )}
        </div>

        {/* Recognized text */}
        {state.recognizedText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">You said:</p>
            <p className="text-lg text-blue-900">{state.recognizedText}</p>
          </div>
        )}

        {/* Score display */}
        {state.score !== null && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pronunciation Score:</span>
              <span className={`text-2xl font-bold ${
                state.score >= threshold ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {Math.round(state.score)}%
              </span>
            </div>
            
            {/* Score bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  state.score >= threshold ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${state.score}%` }}
                role="progressbar"
                aria-valuenow={state.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Pronunciation score"
              />
            </div>

            {/* Feedback message */}
            {feedback && (
              <p className={`text-sm ${feedback.color} text-center`}>
                {feedback.message}
              </p>
            )}
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{state.error}</p>
            {state.permissionDenied && (
              <p className="text-xs text-red-600 mt-2">
                Please allow microphone access in your browser settings to use this feature.
              </p>
            )}
          </div>
        )}

        {/* Retry button */}
        {state.score !== null && state.score < threshold && (
          <div className="flex justify-center">
            <button
              onClick={retry}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                       transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Try again"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
