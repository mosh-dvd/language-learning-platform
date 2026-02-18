/**
 * Property-based tests for device input handling
 * Tests touch, keyboard, and mouse interactions across various inputs
 * Implements Requirements: 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import {
  useDeviceDetection,
  useKeyboardShortcuts,
  useViewport,
} from './useDeviceInput';

describe('Device Input Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: Device detection consistency
   * For any sequence of input events, the detected device should match the most recent event type
   * Validates: Requirements 8.3, 8.4
   */
  it('should consistently detect device type based on most recent input event', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant('touch'),
            fc.constant('mouse'),
            fc.constant('keyboard')
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (eventSequence) => {
          const { result } = renderHook(() => useDeviceDetection());

          // Simulate event sequence
          eventSequence.forEach((eventType) => {
            act(() => {
              switch (eventType) {
                case 'touch':
                  window.dispatchEvent(new TouchEvent('touchstart'));
                  break;
                case 'mouse':
                  window.dispatchEvent(new MouseEvent('mousemove'));
                  break;
                case 'keyboard':
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
                  break;
              }
            });
          });

          // The current device should match the last event in the sequence
          const lastEvent = eventSequence[eventSequence.length - 1];
          expect(result.current.currentDevice).toBe(lastEvent);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Keyboard shortcut handler invocation
   * For any valid key combination, if a matching shortcut exists, the handler should be called exactly once
   * Validates: Requirements 8.4
   */
  it('should invoke keyboard shortcut handler exactly once for matching key', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-zA-Z0-9]$/.test(s)),
        fc.boolean(),
        fc.boolean(),
        (key, ctrlKey, shiftKey) => {
          const handler = vi.fn();
          const shortcuts = [
            {
              key,
              ctrlKey,
              shiftKey,
              handler,
            },
          ];

          renderHook(() => useKeyboardShortcuts(shortcuts, true));

          act(() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', {
                key,
                ctrlKey,
                shiftKey,
              })
            );
          });

          // Handler should be called exactly once
          expect(handler).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Keyboard shortcut non-matching keys
   * For any key that doesn't match the shortcut, the handler should not be called
   * Validates: Requirements 8.4
   */
  it('should not invoke handler for non-matching keyboard shortcuts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-zA-Z0-9]$/.test(s)),
        fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-zA-Z0-9]$/.test(s)),
        (shortcutKey, pressedKey) => {
          // Only test when keys are different
          fc.pre(shortcutKey !== pressedKey);

          const handler = vi.fn();
          const shortcuts = [
            {
              key: shortcutKey,
              handler,
            },
          ];

          renderHook(() => useKeyboardShortcuts(shortcuts, true));

          act(() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: pressedKey,
              })
            );
          });

          // Handler should not be called
          expect(handler).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Viewport dimension accuracy
   * For any window dimensions, the viewport hook should accurately report width and height
   * Validates: Requirements 8.1, 8.2
   */
  it('should accurately report viewport dimensions for any window size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          // Set window dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height,
          });

          const { result } = renderHook(() => useViewport());

          // Dimensions should match
          expect(result.current.width).toBe(width);
          expect(result.current.height).toBe(height);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Viewport breakpoint classification
   * For any viewport width, the device classification should be consistent with breakpoints
   * Validates: Requirements 8.1, 8.2
   */
  it('should correctly classify device type based on viewport width', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        (width) => {
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
          });

          const { result } = renderHook(() => useViewport());

          // Verify breakpoint logic
          if (width < 640) {
            expect(result.current.isMobile).toBe(true);
            expect(result.current.isTablet).toBe(false);
            expect(result.current.isDesktop).toBe(false);
          } else if (width >= 640 && width < 1024) {
            expect(result.current.isMobile).toBe(false);
            expect(result.current.isTablet).toBe(true);
            expect(result.current.isDesktop).toBe(false);
          } else {
            expect(result.current.isMobile).toBe(false);
            expect(result.current.isTablet).toBe(false);
            expect(result.current.isDesktop).toBe(true);
          }

          // Exactly one should be true
          const trueCount = [
            result.current.isMobile,
            result.current.isTablet,
            result.current.isDesktop,
          ].filter(Boolean).length;
          expect(trueCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Viewport orientation detection
   * For any viewport dimensions, orientation should be correctly determined
   * Validates: Requirements 8.1, 8.2
   */
  it('should correctly detect viewport orientation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height,
          });

          const { result } = renderHook(() => useViewport());

          // Verify orientation logic
          if (width > height) {
            expect(result.current.isLandscape).toBe(true);
            expect(result.current.isPortrait).toBe(false);
          } else {
            expect(result.current.isLandscape).toBe(false);
            expect(result.current.isPortrait).toBe(true);
          }

          // Exactly one orientation should be true
          const orientationCount = [
            result.current.isLandscape,
            result.current.isPortrait,
          ].filter(Boolean).length;
          expect(orientationCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Keyboard shortcut with modifiers
   * For any combination of modifier keys, shortcuts should only trigger when all modifiers match
   * Validates: Requirements 8.4
   */
  it('should only trigger shortcuts when all modifier keys match', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-zA-Z]$/.test(s)),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (key, reqCtrl, reqShift, pressCtrl, pressShift) => {
          const handler = vi.fn();
          const shortcuts = [
            {
              key,
              ctrlKey: reqCtrl,
              shiftKey: reqShift,
              handler,
            },
          ];

          renderHook(() => useKeyboardShortcuts(shortcuts, true));

          act(() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', {
                key,
                ctrlKey: pressCtrl,
                shiftKey: pressShift,
              })
            );
          });

          // Handler should only be called if modifiers match
          const shouldTrigger = reqCtrl === pressCtrl && reqShift === pressShift;
          if (shouldTrigger) {
            expect(handler).toHaveBeenCalledTimes(1);
          } else {
            expect(handler).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Touch device flag consistency
   * For any device, if touch events are fired, isTouchDevice should be true
   * Validates: Requirements 8.3
   */
  it('should set isTouchDevice flag when touch events occur', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (touchEventCount) => {
          const { result } = renderHook(() => useDeviceDetection());

          // Fire multiple touch events
          for (let i = 0; i < touchEventCount; i++) {
            act(() => {
              window.dispatchEvent(new TouchEvent('touchstart'));
            });
          }

          // Should be detected as touch device
          expect(result.current.isTouchDevice).toBe(true);
          expect(result.current.currentDevice).toBe('touch');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Disabled shortcuts should never trigger
   * For any keyboard shortcut, when disabled, it should never call the handler
   * Validates: Requirements 8.4
   */
  it('should never trigger disabled keyboard shortcuts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1 }).filter(s => /^[a-zA-Z0-9]$/.test(s)),
        fc.integer({ min: 1, max: 10 }),
        (key, pressCount) => {
          const handler = vi.fn();
          const shortcuts = [
            {
              key,
              handler,
            },
          ];

          renderHook(() => useKeyboardShortcuts(shortcuts, false));

          // Press the key multiple times
          for (let i = 0; i < pressCount; i++) {
            act(() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key }));
            });
          }

          // Handler should never be called when disabled
          expect(handler).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });
});
