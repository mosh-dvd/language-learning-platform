/**
 * Tests for useDeviceInput hooks
 * Validates device detection and input handling
 * Implements Requirements: 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDeviceDetection,
  useKeyboardShortcuts,
  useViewport,
  usePrefersReducedMotion,
} from './useDeviceInput';

describe('useDeviceDetection', () => {
  it('should detect touch device when touchstart event fires', () => {
    const { result } = renderHook(() => useDeviceDetection());

    expect(result.current.currentDevice).toBe('unknown');

    act(() => {
      window.dispatchEvent(new TouchEvent('touchstart'));
    });

    expect(result.current.currentDevice).toBe('touch');
    expect(result.current.isTouchDevice).toBe(true);
  });

  it('should detect mouse device when mousemove event fires', () => {
    const { result } = renderHook(() => useDeviceDetection());

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(result.current.currentDevice).toBe('mouse');
    expect(result.current.isMouseDevice).toBe(true);
  });

  it('should detect keyboard device when keydown event fires', () => {
    const { result } = renderHook(() => useDeviceDetection());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(result.current.currentDevice).toBe('keyboard');
  });

  it('should detect touch support capability', () => {
    const { result } = renderHook(() => useDeviceDetection());

    // supportsTouch depends on browser capabilities
    expect(typeof result.current.supportsTouch).toBe('boolean');
  });
});

describe('useKeyboardShortcuts', () => {
  it('should call handler when matching shortcut is pressed', () => {
    const handler = vi.fn();
    const shortcuts = [
      {
        key: 'Enter',
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when shortcut is disabled', () => {
    const handler = vi.fn();
    const shortcuts = [
      {
        key: 'Enter',
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle shortcuts with modifier keys', () => {
    const handler = vi.fn();
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    // Without ctrl key - should not trigger
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    });
    expect(handler).not.toHaveBeenCalled();

    // With ctrl key - should trigger
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should prevent default when shortcut matches', () => {
    const handler = vi.fn();
    const shortcuts = [
      {
        key: 'Enter',
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, true));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('useViewport', () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('should return current viewport dimensions', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it('should detect desktop viewport', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('should detect mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('should detect tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect orientation', () => {
    // Landscape
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useViewport());

    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
  });

  it('should update on window resize', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1024);

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(375);
    expect(result.current.isMobile).toBe(true);
  });
});

describe('usePrefersReducedMotion', () => {
  let matchMediaMock: vi.Mock;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when user does not prefer reduced motion', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('should return true when user prefers reduced motion', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('should update when preference changes', () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);

    // Simulate preference change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });
});
