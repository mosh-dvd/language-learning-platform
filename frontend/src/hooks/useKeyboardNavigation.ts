/**
 * useKeyboardNavigation Hook
 * Provides keyboard navigation utilities for components
 * Requirements: 15.3, 15.5
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

export interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook to manage keyboard navigation and shortcuts
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { shortcuts = [], enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
      });

      if (matchingShortcut) {
        if (preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.handler(event);
      }
    },
    [enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

/**
 * Hook to trap focus within a container (useful for modals/dialogs)
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, active: boolean = true) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap activates
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey as EventListener);

    return () => {
      container.removeEventListener('keydown', handleTabKey as EventListener);
    };
  }, [containerRef, active]);
}

/**
 * Hook to manage roving tabindex for arrow key navigation
 * Useful for lists, grids, and toolbars
 */
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    direction?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { direction = 'both', loop = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[role="button"], button, [role="option"], [role="tab"]')
    );

    if (items.length === 0) return;

    // Set initial tabindex
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentIndex = items.findIndex((item) => item === document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      let handled = false;

      switch (event.key) {
        case 'ArrowRight':
          if (direction === 'horizontal' || direction === 'both') {
            nextIndex = currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowLeft':
          if (direction === 'horizontal' || direction === 'both') {
            nextIndex = currentIndex - 1;
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (direction === 'vertical' || direction === 'both') {
            nextIndex = currentIndex + 1;
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (direction === 'vertical' || direction === 'both') {
            nextIndex = currentIndex - 1;
            handled = true;
          }
          break;
        case 'Home':
          nextIndex = 0;
          handled = true;
          break;
        case 'End':
          nextIndex = items.length - 1;
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();

        // Handle looping
        if (loop) {
          if (nextIndex < 0) nextIndex = items.length - 1;
          if (nextIndex >= items.length) nextIndex = 0;
        } else {
          nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
        }

        // Update tabindex and focus
        items[currentIndex].setAttribute('tabindex', '-1');
        items[nextIndex].setAttribute('tabindex', '0');
        items[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      container.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [containerRef, direction, loop, enabled]);
}

/**
 * Hook to announce messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
}
