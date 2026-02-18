import React, { useState, useEffect } from 'react';

interface ImageText {
  id: string;
  imageId: string;
  languageCode: string;
  text: string;
  version: number;
  createdAt: string;
}

interface ImageTextEditorProps {
  imageId: string;
  onSave?: (imageText: ImageText) => void;
  onError?: (error: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
];

export const ImageTextEditor: React.FC<ImageTextEditorProps> = ({
  imageId,
  onSave,
  onError,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [text, setText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const [existingTexts, setExistingTexts] = useState<Record<string, ImageText>>({});
  const [versionHistory, setVersionHistory] = useState<ImageText[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load existing texts for the image
  useEffect(() => {
    const loadTexts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/image-texts/${imageId}`);
        if (response.ok) {
          const texts: ImageText[] = await response.json();
          const textsMap: Record<string, ImageText> = {};
          texts.forEach((t) => {
            textsMap[t.languageCode] = t;
          });
          setExistingTexts(textsMap);
          
          // Set initial text if exists for selected language
          if (textsMap[selectedLanguage]) {
            setText(textsMap[selectedLanguage].text);
          }
        }
      } catch (error) {
        console.error('Error loading texts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTexts();
  }, [imageId]);

  // Load text when language changes
  useEffect(() => {
    if (existingTexts[selectedLanguage]) {
      setText(existingTexts[selectedLanguage].text);
    } else {
      setText('');
    }
    setVersionHistory([]);
    setShowHistory(false);
  }, [selectedLanguage, existingTexts]);

  const validateText = (value: string): string | null => {
    if (!value.trim()) {
      return 'Text cannot be empty';
    }

    // Check for valid Unicode characters (basic validation)
    if (!/^[\p{L}\p{N}\p{P}\p{Z}\p{S}\p{M}]+$/u.test(value)) {
      return 'Text contains invalid characters';
    }

    return null;
  };

  const handleTextChange = (value: string) => {
    setText(value);
    const error = validateText(value);
    setValidationError(error);
  };

  const handleSave = async () => {
    const error = validateText(text);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const isUpdate = !!existingTexts[selectedLanguage];
      const url = isUpdate
        ? `/api/image-texts/${imageId}/${selectedLanguage}`
        : '/api/image-texts';
      
      const method = isUpdate ? 'PUT' : 'POST';
      const body = isUpdate
        ? { text: text.trim() }
        : { imageId, languageCode: selectedLanguage, text: text.trim() };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save text');
      }

      const savedText: ImageText = await response.json();
      
      // Update existing texts
      setExistingTexts((prev) => ({
        ...prev,
        [selectedLanguage]: savedText,
      }));

      onSave?.(savedText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save text';
      setValidationError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/image-texts/${imageId}/${selectedLanguage}/history`
      );
      
      if (response.ok) {
        const history: ImageText[] = await response.json();
        setVersionHistory(history);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error loading version history:', error);
      onError?.('Failed to load version history');
    }
  };

  const handleRestoreVersion = (version: ImageText) => {
    setText(version.text);
    setShowHistory(false);
  };

  const handleToggleHint = () => {
    setShowHint(!showHint);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Edit Image Text</h2>

      {/* Language Selector */}
      <div className="mb-4">
        <label
          htmlFor="language"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Language
        </label>
        <select
          id="language"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSaving}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.code})
              {existingTexts[lang.code] && ' ✓'}
            </option>
          ))}
        </select>
      </div>

      {/* Text Editor */}
      <div className="mb-4">
        <label
          htmlFor="text"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Text <span className="text-red-500">*</span>
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Enter text in ${SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-32"
          disabled={isSaving}
          required
          aria-required="true"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? 'text-error' : undefined}
        />
        {validationError && (
          <p id="text-error" className="mt-1 text-sm text-red-600" role="alert">
            {validationError}
          </p>
        )}
      </div>

      {/* Hint Toggle */}
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showHint}
            onChange={handleToggleHint}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            disabled={isSaving}
          />
          <span className="text-sm text-gray-700">
            Show as hint (optional translation)
          </span>
        </label>
        {showHint && (
          <div className="mt-2">
            <input
              type="text"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              placeholder="Enter hint text (e.g., native language translation)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSaving}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !text.trim() || !!validationError}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : existingTexts[selectedLanguage] ? 'Update' : 'Save'}
        </button>
        
        {existingTexts[selectedLanguage] && (
          <button
            type="button"
            onClick={handleLoadHistory}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        )}
      </div>

      {/* Version History */}
      {showHistory && versionHistory.length > 0 && (
        <div className="border border-gray-300 rounded-md p-4">
          <h3 className="text-lg font-semibold mb-3">Version History</h3>
          <div className="space-y-2">
            {versionHistory.map((version) => (
              <div
                key={version.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Version {version.version}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{version.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreVersion(version)}
                  className="ml-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Translations Summary */}
      {Object.keys(existingTexts).length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Available Translations
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(existingTexts).map(([langCode, textData]) => (
              <span
                key={langCode}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {SUPPORTED_LANGUAGES.find((l) => l.code === langCode)?.name || langCode}
                <span className="ml-1 text-xs text-green-600">
                  (v{textData.version})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
