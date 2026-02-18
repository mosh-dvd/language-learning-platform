/**
 * LanguageSelector Component
 * Displays language selection interface for native and target languages
 * Requirements: 6.1, 6.4, 6.5
 */

import { useState, useEffect } from 'react';

export interface LanguageSelectorProps {
  onLanguageSelect: (nativeLanguage: string, targetLanguage: string) => void;
  initialNativeLanguage?: string;
  initialTargetLanguage?: string;
  className?: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Supported languages with native names for accessibility
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

// Interface text translations for showing UI in native language
const INTERFACE_TEXT: Record<string, {
  title: string;
  nativeLanguageLabel: string;
  targetLanguageLabel: string;
  submitButton: string;
  validationError: string;
  sameLanguageError: string;
}> = {
  en: {
    title: 'Select Your Languages',
    nativeLanguageLabel: 'Your Native Language',
    targetLanguageLabel: 'Language You Want to Learn',
    submitButton: 'Start Learning',
    validationError: 'Please select both languages',
    sameLanguageError: 'Native and target languages must be different',
  },
  es: {
    title: 'Selecciona Tus Idiomas',
    nativeLanguageLabel: 'Tu Idioma Nativo',
    targetLanguageLabel: 'Idioma Que Quieres Aprender',
    submitButton: 'Comenzar a Aprender',
    validationError: 'Por favor selecciona ambos idiomas',
    sameLanguageError: 'Los idiomas nativo y objetivo deben ser diferentes',
  },
  fr: {
    title: 'Sélectionnez Vos Langues',
    nativeLanguageLabel: 'Votre Langue Maternelle',
    targetLanguageLabel: 'Langue Que Vous Voulez Apprendre',
    submitButton: 'Commencer à Apprendre',
    validationError: 'Veuillez sélectionner les deux langues',
    sameLanguageError: 'Les langues maternelle et cible doivent être différentes',
  },
  de: {
    title: 'Wählen Sie Ihre Sprachen',
    nativeLanguageLabel: 'Ihre Muttersprache',
    targetLanguageLabel: 'Sprache, Die Sie Lernen Möchten',
    submitButton: 'Lernen Beginnen',
    validationError: 'Bitte wählen Sie beide Sprachen',
    sameLanguageError: 'Mutter- und Zielsprache müssen unterschiedlich sein',
  },
  // Default to English for other languages
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onLanguageSelect,
  initialNativeLanguage = '',
  initialTargetLanguage = '',
  className = '',
}) => {
  const [nativeLanguage, setNativeLanguage] = useState(initialNativeLanguage);
  const [targetLanguage, setTargetLanguage] = useState(initialTargetLanguage);
  const [error, setError] = useState<string>('');

  // Get interface text based on selected native language
  const interfaceText = INTERFACE_TEXT[nativeLanguage] || INTERFACE_TEXT.en;

  // Validate language codes
  const isLanguageSupported = (code: string): boolean => {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate both languages are selected
    if (!nativeLanguage || !targetLanguage) {
      setError(interfaceText.validationError);
      return;
    }

    // Validate languages are supported
    if (!isLanguageSupported(nativeLanguage) || !isLanguageSupported(targetLanguage)) {
      setError('Selected language is not supported');
      return;
    }

    // Validate languages are different
    if (nativeLanguage === targetLanguage) {
      setError(interfaceText.sameLanguageError);
      return;
    }

    // Store preferences
    onLanguageSelect(nativeLanguage, targetLanguage);
  };

  // Update interface text when native language changes
  useEffect(() => {
    // Clear error when languages change
    setError('');
  }, [nativeLanguage, targetLanguage]);

  return (
    <div className={`language-selector ${className}`}>
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {interfaceText.title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Native Language Selection */}
          <div>
            <label
              htmlFor="native-language"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {interfaceText.nativeLanguageLabel}
            </label>
            <select
              id="native-language"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            >
              <option value="">Select your native language</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Target Language Selection */}
          <div>
            <label
              htmlFor="target-language"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {interfaceText.targetLanguageLabel}
            </label>
            <select
              id="target-language"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            >
              <option value="">Select language to learn</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                  disabled={lang.code === nativeLanguage}
                >
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={interfaceText.submitButton}
          >
            {interfaceText.submitButton}
          </button>
        </form>

        {/* Language Preview */}
        {nativeLanguage && targetLanguage && !error && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Learning{' '}
              <span className="font-semibold text-gray-900">
                {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.nativeName}
              </span>
              {' '}from{' '}
              <span className="font-semibold text-gray-900">
                {SUPPORTED_LANGUAGES.find(l => l.code === nativeLanguage)?.nativeName}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
