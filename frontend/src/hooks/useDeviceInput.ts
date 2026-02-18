/**
 * useDeviceInput Hook
 * Provides device-specific input handling for touch, keyboard, and mouse
 * Implements Requirements: 8.3, 8.4
 */

import { useEffect, useState, useCallback, RefObject } from 'react';

export type InputDevice = 'touch' | 'mouse' | 'keyboard' | 'unknown';

interface DeviceInputState {
  currentDevice: InputDevice;
  isTouchDevice: boolean;
  isMouseDevice: boolean;
  supportsTouch: boolean;
}

/**
 * Hook to detect and track the current input device
 */
export const useDeviceDetection = (): DeviceInputState => {
  const [currentDevice, setCurrentDevice] = useState<InputDevice>('unknown');
  const [supportsTouch] = useState(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  );

  useEffect(() => {
    // Detect touch input
    const handleTouchStart = () => {
      setCurrentDevice('touch');
    };

    // Detect mouse input
    const handleMouseMove = () => {
      if (currentDevice !== 'mouse') {
        setCurrentDevice('mouse');
      }
    };

    // Detect keyboard input
    const handleKeyDown = () => {
      setCurrentDevice('keyboard');
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentDevice]);

  return {
    currentDevice,
    isTouchDevice: currentDevice === 'touch',
    isMouseDevice: currentDevice === 'mouse',
    supportsTouch,
  };
};

interface TouchHandlers {
  onTouchStart?: (e: TouchEvent) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
}

/**
 * Hook to handle touch events on an element
 */
export const useTouchHandlers = (
  elementRef: RefObject<HTMLElement>,
  handlers: TouchHandlers
) => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const { onTouchStart, onTouchMove, onTouchEnd } = handlers;

    if (onTouchStart) {
      element.addEventListener('touchstart', onTouchStart, { passive: true });
    }
    if (onTouchMove) {
      element.addEventListener('touchmove', onTouchMove, { passive: true });
    }
    if (onTouchEnd) {
      element.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    return () => {
      if (onTouchStart) {
        element.removeEventListener('touchstart', onTouchStart);
      }
      if (onTouchMove) {
        element.removeEventListener('touchmove', onTouchMove);
      }
      if (onTouchEnd) {
        element.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, [elementRef, handlers]);
};

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

/**
 * Hook to detect swipe gestures on touch devices
 */
export const useSwipeGesture = (
  elementRef: RefObject<HTMLElement>,
  handlers: SwipeHandlers
) => {
  const threshold = handlers.threshold || 50;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Determine if horizontal or vertical swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handlers, threshold]);
};

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
}

/**
 * Hook to register keyboard shortcuts
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = e.key === shortcut.key;
        const ctrlMatches = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey;
        const shiftMatches = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || e.altKey === shortcut.altKey;
        const metaMatches = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
};

/**
 * Hook to handle click/tap events with proper touch support
 */
export const useClickHandler = (
  handler: () => void,
  options?: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }
) => {
  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (options?.preventDefault) {
      e.preventDefault();
    }
    if (options?.stopPropagation) {
      e.stopPropagation();
    }
    handler();
  }, [handler, options]);

  return {
    onClick: handleClick,
    onTouchEnd: handleClick,
  };
};

/**
 * Hook to detect if user prefers reduced motion
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook to detect viewport size and orientation
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    isPortrait: window.innerHeight > window.innerWidth,
    isLandscape: window.innerWidth > window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        isPortrait: height > width,
        isLandscape: width > height,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewport;
};
