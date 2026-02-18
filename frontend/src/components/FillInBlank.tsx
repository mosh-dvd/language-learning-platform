import React, { useState, useRef } from 'react';
import { useRovingTabIndex } from '../hooks/useKeyboardNavigation';

interface FillInBlankProps {
  sentence: string;
  blankIndex: number;
  options: string[];
  correctAnswer: string;
  onComplete: (correct: boolean) => void;
}

export const FillInBlank: React.FC<FillInBlankProps> = ({
  sentence,
  blankIndex,
  options,
  correctAnswer,
  onComplete,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  
  // Enable roving tabindex for keyboard navigation
  useRovingTabIndex(optionsContainerRef, { direction: 'both', loop: true });

  const words = sentence.split(' ');
  const beforeBlank = words.slice(0, blankIndex).join(' ');
  const afterBlank = words.slice(blankIndex + 1).join(' ');

  const handleOptionClick = (option: string) => {
    if (!submitted) {
      setSelectedOption(option);
    }
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const correct = selectedOption === correctAnswer;
    setIsCorrect(correct);
    setSubmitted(true);
    onComplete(correct);
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
  };

  // Keyboard handler for Enter/Space
  const handleKeyDown = (option: string) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionClick(option);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-2xl mx-auto" role="region" aria-label="Fill in the blank exercise">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Fill in the Blank
      </h2>
      <p className="text-sm text-gray-600 mb-4" id="fill-instructions">
        Use Tab to navigate options, Enter or Space to select. Choose the word that best completes the sentence.
      </p>
      <div className="w-full bg-gray-50 p-6 rounded-lg mb-6">
        <p className="text-xl text-gray-900 leading-relaxed text-center">
          {beforeBlank}{' '}
          <span
            className={`inline-block min-w-[120px] px-4 py-2 rounded border-2 font-semibold ${
              submitted
                ? isCorrect
                  ? 'bg-green-100 border-green-500 text-green-900'
                  : 'bg-red-100 border-red-500 text-red-900'
                : selectedOption
                  ? 'bg-blue-100 border-blue-500 text-blue-900'
                  : 'bg-white border-gray-300 text-gray-400'
            }`}
            role="status"
            aria-label={selectedOption ? `Selected: ${selectedOption}` : 'Blank to fill'}
            aria-live="polite"
          >
            {selectedOption || '______'}
          </span>{' '}
          {afterBlank}
        </p>
      </div>

      <div className="w-full mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3" id="options-heading">
          Choose the correct word:
        </h3>
        <div 
          className="grid grid-cols-2 gap-3" 
          ref={optionsContainerRef}
          role="group"
          aria-labelledby="options-heading"
          aria-describedby="fill-instructions"
        >
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              onKeyDown={handleKeyDown(option)}
              disabled={submitted}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
              className={`p-4 rounded-lg border-2 transition-all text-lg font-medium ${
                submitted
                  ? option === correctAnswer
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : option === selectedOption
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                  : selectedOption === option
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-lg'
                    : 'border-gray-300 bg-white text-gray-900 hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`Option: ${option}${selectedOption === option ? ' - selected' : ''}${submitted && option === correctAnswer ? ' - correct answer' : ''}`}
              aria-pressed={selectedOption === option}
              aria-disabled={submitted}
            >
              {option}
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
              : `✗ Incorrect. The correct answer is "${correctAnswer}".`}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedOption === null
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
