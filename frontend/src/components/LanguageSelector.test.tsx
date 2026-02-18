/**
 * LanguageSelector Component Tests
 * Tests for language selection interface
 * Requirements: 6.1, 6.4, 6.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';

describe('LanguageSelector', () => {
  it('renders language selection interface', () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    expect(screen.getByText('Select Your Languages')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Native Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Language You Want to Learn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start learning/i })).toBeInTheDocument();
  });

  it('displays all supported languages in dropdowns', () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    const targetSelect = screen.getByLabelText('Language You Want to Learn');

    // Check that both dropdowns have language options
    const nativeOptions = nativeSelect.querySelectorAll('option');
    const targetOptions = targetSelect.querySelectorAll('option');

    // Should have placeholder + 20 languages
    expect(nativeOptions.length).toBe(21);
    expect(targetOptions.length).toBe(21);

    // Check for specific languages
    expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Español/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Français/i).length).toBeGreaterThan(0);
  });

  it('validates that both languages are selected', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const submitButton = screen.getByRole('button', { name: /start learning/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select both languages')).toBeInTheDocument();
    });

    expect(onLanguageSelect).not.toHaveBeenCalled();
  });

  it('validates that native and target languages are different', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    const targetSelect = screen.getByLabelText('Language You Want to Learn');

    fireEvent.change(nativeSelect, { target: { value: 'en' } });
    fireEvent.change(targetSelect, { target: { value: 'en' } });

    const submitButton = screen.getByRole('button', { name: /start learning/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Native and target languages must be different')).toBeInTheDocument();
    });

    expect(onLanguageSelect).not.toHaveBeenCalled();
  });

  it('calls onLanguageSelect with valid language selection', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    const targetSelect = screen.getByLabelText('Language You Want to Learn');

    fireEvent.change(nativeSelect, { target: { value: 'en' } });
    fireEvent.change(targetSelect, { target: { value: 'es' } });

    const submitButton = screen.getByRole('button', { name: /start learning/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onLanguageSelect).toHaveBeenCalledWith('en', 'es');
    });
  });

  it('disables target language option when it matches native language', () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    fireEvent.change(nativeSelect, { target: { value: 'en' } });

    const targetSelect = screen.getByLabelText('Language You Want to Learn');
    const englishOption = Array.from(targetSelect.querySelectorAll('option')).find(
      option => (option as HTMLOptionElement).value === 'en'
    ) as HTMLOptionElement;

    expect(englishOption?.disabled).toBe(true);
  });

  it('shows interface in native language when selected', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    
    // Select Spanish as native language
    fireEvent.change(nativeSelect, { target: { value: 'es' } });

    await waitFor(() => {
      expect(screen.getByText('Selecciona Tus Idiomas')).toBeInTheDocument();
      expect(screen.getByText('Tu Idioma Nativo')).toBeInTheDocument();
      expect(screen.getByText('Idioma Que Quieres Aprender')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /comenzar a aprender/i })).toBeInTheDocument();
    });
  });

  it('shows language preview when both languages are selected', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    const targetSelect = screen.getByLabelText('Language You Want to Learn');

    fireEvent.change(nativeSelect, { target: { value: 'en' } });
    fireEvent.change(targetSelect, { target: { value: 'es' } });

    await waitFor(() => {
      // Check for the preview text specifically (not the button)
      const previewText = screen.getByText((content, element) => {
        return element?.tagName === 'P' && content.includes('Learning') && content.includes('from');
      });
      expect(previewText).toBeInTheDocument();
      expect(previewText).toHaveTextContent('Español');
      expect(previewText).toHaveTextContent('English');
    });
  });

  it('clears error when languages change', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const submitButton = screen.getByRole('button', { name: /start learning/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select both languages')).toBeInTheDocument();
    });

    const nativeSelect = screen.getByLabelText('Your Native Language');
    fireEvent.change(nativeSelect, { target: { value: 'en' } });

    await waitFor(() => {
      expect(screen.queryByText('Please select both languages')).not.toBeInTheDocument();
    });
  });

  it('supports initial language values', () => {
    const onLanguageSelect = vi.fn();
    render(
      <LanguageSelector
        onLanguageSelect={onLanguageSelect}
        initialNativeLanguage="en"
        initialTargetLanguage="fr"
      />
    );

    const nativeSelect = screen.getByLabelText('Your Native Language') as HTMLSelectElement;
    const targetSelect = screen.getByLabelText('Language You Want to Learn') as HTMLSelectElement;

    expect(nativeSelect.value).toBe('en');
    expect(targetSelect.value).toBe('fr');
  });

  it('has proper ARIA attributes for accessibility', () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const nativeSelect = screen.getByLabelText('Your Native Language');
    const targetSelect = screen.getByLabelText('Language You Want to Learn');

    expect(nativeSelect).toHaveAttribute('aria-required', 'true');
    expect(targetSelect).toHaveAttribute('aria-required', 'true');
  });

  it('shows error with proper ARIA attributes', async () => {
    const onLanguageSelect = vi.fn();
    render(<LanguageSelector onLanguageSelect={onLanguageSelect} />);

    const submitButton = screen.getByRole('button', { name: /start learning/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });
  });
});
