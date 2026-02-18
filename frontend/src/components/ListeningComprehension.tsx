import React, { useState, useRef } from 'react';
import { useRovingTabIndex } from '../hooks/useKeyboardNavigation';

interface ListeningComprehensionProps {
  audioUrl: string;
  images: string[];
  correctImageIndex: number;
  onComplete: (correct: boolean) => void;
}

export const ListeningComprehension: React.FC<ListeningComprehensionProps> = ({
  audioUrl,
  images,
  correctImageIndex,
  onComplete,
}) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement] = useState(() => new Audio(audioUrl));
  
  const imagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Enable roving tabindex for keyboard navigation
  useRovingTabIndex(imagesContainerRef, { direction: 'both', loop: true });

  const handlePlayAudio = () => {
    if (isPlaying) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);

      audioElement.onended = () => {
        setIsPlaying(false);
      };

      audioElement.onerror = () => {
        setIsPlaying(false);
      };
    }
  };

  const handleImageClick = (index: number) => {
    if (!submitted) {
      setSelectedImage(index);
    }
  };

  const handleSubmit = () => {
    if (selectedImage === null) return;

    const correct = selectedImage === correctImageIndex;
    setIsCorrect(correct);
    setSubmitted(true);
    onComplete(correct);
  };

  const handleRetry = () => {
    setSelectedImage(null);
    setSubmitted(false);
    setIsCorrect(false);
  };

  // Keyboard handler for Enter/Space
  const handleKeyDown = (index: number) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleImageClick(index);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-4xl mx-auto" role="region" aria-label="Listening comprehension exercise">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Listening Comprehension
      </h2>

      <div className="mb-8">
        <p className="text-lg text-gray-700 mb-4 text-center" id="listening-instructions">
          Listen to the audio and select the matching image. Use Tab to navigate, Enter or Space to select.
        </p>
        <button
          onClick={handlePlayAudio}
          className={`flex items-center gap-3 px-6 py-4 rounded-lg font-semibold transition-all ${
            isPlaying
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } shadow-md hover:shadow-lg`}
          aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
          aria-pressed={isPlaying}
          title={isPlaying ? 'Stop audio (Space or Enter)' : 'Play audio (Space or Enter)'}
        >
          {isPlaying ? (
            <>
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              Stop Audio
            </>
          ) : (
            <>
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Play Audio
            </>
          )}
        </button>
        {isPlaying && (
          <div className="mt-2 flex items-center gap-2 text-blue-600" role="status" aria-live="polite">
            <svg
              className="w-5 h-5 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            <span className="text-sm font-medium">Playing...</span>
          </div>
        )}
      </div>

      <div className="w-full mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center" id="images-heading">
          Select the correct image:
        </h3>
        <div 
          className="grid grid-cols-2 md:grid-cols-3 gap-4" 
          ref={imagesContainerRef}
          role="group"
          aria-labelledby="images-heading"
          aria-describedby="listening-instructions"
        >
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleImageClick(index)}
              onKeyDown={handleKeyDown(index)}
              disabled={submitted}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
              className={`relative p-2 rounded-lg border-4 transition-all ${
                submitted
                  ? index === correctImageIndex
                    ? 'border-green-500 bg-green-50'
                    : index === selectedImage
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                  : selectedImage === index
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`Image option ${index + 1}${selectedImage === index ? ' - selected' : ''}${submitted && index === correctImageIndex ? ' - correct answer' : ''}`}
              aria-pressed={selectedImage === index}
              aria-disabled={submitted}
            >
              <img
                src={image}
                alt={`Option ${index + 1}`}
                className="w-full h-40 object-cover rounded"
              />
              {submitted && index === correctImageIndex && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center" aria-label="Correct">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              {submitted && index === selectedImage && index !== correctImageIndex && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center" aria-label="Incorrect">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {submitted && (
        <div
          className={`w-full p-4 rounded-lg mb-4 ${
            isCorrect ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
          }`}
          role="alert"
          aria-live="assertive"
        >
          <p className="text-center font-semibold">
            {isCorrect
              ? '✓ Correct! Well done!'
              : '✗ Incorrect. Try again!'}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedImage === null}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedImage === null
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
            }`}
            aria-label="Submit answer"
          >
            Submit
          </button>
        ) : (
          !isCorrect && (
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg transition-all"
              aria-label="Try again"
            >
              Try Again
            </button>
          )
        )}
      </div>
    </div>
  );
};
