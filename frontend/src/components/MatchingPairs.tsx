import React, { useState, useRef, useEffect } from 'react';
import { useRovingTabIndex } from '../hooks/useKeyboardNavigation';

interface Pair {
  image: string;
  text: string;
}

interface MatchingPairsProps {
  pairs: Pair[];
  onComplete: (correct: boolean) => void;
}

export const MatchingPairs: React.FC<MatchingPairsProps> = ({
  pairs,
  onComplete,
}) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Enable roving tabindex for keyboard navigation
  useRovingTabIndex(imageContainerRef, { direction: 'vertical', loop: true });
  useRovingTabIndex(textContainerRef, { direction: 'vertical', loop: true });

  const handleImageClick = (index: number) => {
    if (matched.has(index)) return;
    setSelectedImage(index);
    if (selectedText !== null) {
      checkMatch(index, selectedText);
    }
  };

  const handleTextClick = (index: number) => {
    const textKey = index + pairs.length; // Offset to avoid collision with image indices
    if (matched.has(textKey)) return;
    setSelectedText(index);
    if (selectedImage !== null) {
      checkMatch(selectedImage, index);
    }
  };

  const checkMatch = (imageIndex: number, textIndex: number) => {
    setAttempts((prev) => prev + 1);

    if (pairs[imageIndex].text === pairs[textIndex].text) {
      const newMatched = new Set(matched);
      newMatched.add(imageIndex);
      newMatched.add(textIndex + pairs.length); // Offset text indices to avoid collision
      setMatched(newMatched);

      // Check if all pairs are matched (pairs.length images + pairs.length texts)
      if (newMatched.size === pairs.length * 2) {
        onComplete(true);
      }
    }

    setSelectedImage(null);
    setSelectedText(null);
  };

  // Keyboard handler for Enter/Space
  const handleKeyDown = (type: 'image' | 'text', index: number) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (type === 'image') {
        handleImageClick(index);
      } else {
        handleTextClick(index);
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-6" role="region" aria-label="Matching pairs exercise">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Match the Images with Text
      </h2>
      <p className="text-sm text-gray-600 mb-4" id="matching-instructions">
        Use Tab to navigate, Enter or Space to select. Match each image with its corresponding text.
      </p>
      <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="flex flex-col gap-4" ref={imageContainerRef} role="group" aria-labelledby="images-heading">
          <h3 id="images-heading" className="text-lg font-semibold text-gray-700 mb-2">Images</h3>
          {pairs.map((pair, index) => (
            <button
              key={`image-${index}`}
              onClick={() => handleImageClick(index)}
              onKeyDown={handleKeyDown('image', index)}
              disabled={matched.has(index)}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
              className={`p-4 rounded-lg border-2 transition-all ${
                matched.has(index)
                  ? 'border-green-500 bg-green-50 opacity-50 cursor-not-allowed'
                  : selectedImage === index
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`Image ${index + 1}${matched.has(index) ? ' - matched' : selectedImage === index ? ' - selected' : ''}`}
              aria-pressed={selectedImage === index}
              aria-disabled={matched.has(index)}
              aria-describedby="matching-instructions"
            >
              <img
                src={pair.image}
                alt={matched.has(index) ? pair.text : `Image ${index + 1}`}
                className="w-full h-32 object-cover rounded"
              />
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4" ref={textContainerRef} role="group" aria-labelledby="text-heading">
          <h3 id="text-heading" className="text-lg font-semibold text-gray-700 mb-2">Text</h3>
          {pairs.map((pair, index) => (
            <button
              key={`text-${index}`}
              onClick={() => handleTextClick(index)}
              onKeyDown={handleKeyDown('text', index)}
              disabled={matched.has(index + pairs.length)}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                matched.has(index + pairs.length)
                  ? 'border-green-500 bg-green-50 opacity-50 cursor-not-allowed'
                  : selectedText === index
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
              aria-label={`Text option ${index + 1}: ${pair.text}${matched.has(index + pairs.length) ? ' - matched' : selectedText === index ? ' - selected' : ''}`}
              aria-pressed={selectedText === index}
              aria-disabled={matched.has(index + pairs.length)}
              aria-describedby="matching-instructions"
            >
              <span className="text-lg font-medium text-gray-900">
                {pair.text}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 text-gray-600" role="status" aria-live="polite" aria-atomic="true">
        <p>Attempts: {attempts}</p>
        <p>Matched: {matched.size / 2} of {pairs.length} pairs</p>
      </div>
    </div>
  );
};
