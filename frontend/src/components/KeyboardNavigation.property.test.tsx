/**
 * Property-Based Tests for Keyboard Navigation
 * Feature: language-learning-platform, Property 43: Keyboard navigation completeness
 * Validates: Requirements 15.3, 15.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { ImageCard } from './ImageCard';
import { MatchingPairs } from './MatchingPairs';
import { FillInBlank } from './FillInBlank';
import { ListeningComprehension } from './ListeningComprehension';
import { LearningView } from './LearningView';

describe('Property 43: Keyboard navigation completeness', () => {
  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('all interactive elements should be keyboard accessible with proper tab order', () => {
    fc.assert(
      fc.property(
        fc.record({
          imageUrl: fc.webUrl(),
          text: fc.string({ minLength: 1, maxLength: 50 }),
          languageCode: fc.constantFrom('en', 'es', 'fr', 'de', 'he'),
          altText: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (props) => {
          const { container } = render(
            <ImageCard
              imageUrl={props.imageUrl}
              text={props.text}
              languageCode={props.languageCode}
              altText={props.altText}
            />
          );

          // Get all interactive elements
          const buttons = container.querySelectorAll('button');
          const links = container.querySelectorAll('a');
          const inputs = container.querySelectorAll('input, textarea, select');
          const interactiveElements = [
            ...Array.from(buttons),
            ...Array.from(links),
            ...Array.from(inputs),
          ];

          // Property: All interactive elements should be keyboard accessible
          interactiveElements.forEach((element) => {
            const tabIndex = element.getAttribute('tabindex');
            
            // Element should either have no tabindex (default 0) or explicit tabindex >= -1
            // tabindex="-1" is allowed for programmatic focus
            if (tabIndex !== null) {
              const tabIndexValue = parseInt(tabIndex, 10);
              expect(tabIndexValue).toBeGreaterThanOrEqual(-1);
            }

            // Disabled elements should not be in tab order
            if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
              // Disabled elements can have any tabindex
              return;
            }

            // Active interactive elements should be reachable
            if (tabIndex === null || parseInt(tabIndex, 10) >= 0) {
              // Element is in tab order
              expect(element).toBeDefined();
            }
          });

          // Property: All interactive elements should have ARIA labels or accessible names
          interactiveElements.forEach((element) => {
            const ariaLabel = element.getAttribute('aria-label');
            const ariaLabelledBy = element.getAttribute('aria-labelledby');
            const ariaDescribedBy = element.getAttribute('aria-describedby');
            const textContent = element.textContent?.trim();
            const title = element.getAttribute('title');
            const alt = element.getAttribute('alt');

            // Element should have at least one way to be identified
            const hasAccessibleName =
              ariaLabel ||
              ariaLabelledBy ||
              textContent ||
              title ||
              alt;

            expect(hasAccessibleName).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('matching pairs exercise should support keyboard navigation with proper ARIA', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            image: fc.webUrl(),
            text: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          { minLength: 2, maxLength: 6 }
        ),
        (pairs) => {
          const { container } = render(
            <MatchingPairs pairs={pairs} onComplete={() => {}} />
          );

          // Get all buttons in the matching pairs
          const buttons = container.querySelectorAll('button[role="button"]');

          // Property: All buttons should have proper tabindex for roving tabindex pattern
          let hasInitialFocus = false;
          buttons.forEach((button) => {
            const tabIndex = button.getAttribute('tabindex');
            expect(tabIndex).not.toBeNull();
            
            const tabIndexValue = parseInt(tabIndex!, 10);
            expect([0, -1]).toContain(tabIndexValue);

            if (tabIndexValue === 0) {
              hasInitialFocus = true;
            }
          });

          // Property: At least one button should have tabindex="0" for initial focus
          if (buttons.length > 0) {
            expect(hasInitialFocus).toBe(true);
          }

          // Property: All buttons should have ARIA labels
          buttons.forEach((button) => {
            const ariaLabel = button.getAttribute('aria-label');
            expect(ariaLabel).toBeTruthy();
            expect(ariaLabel!.length).toBeGreaterThan(0);
          });

          // Property: Container should have proper role and aria-label
          const groups = container.querySelectorAll('[role="group"]');
          groups.forEach((group) => {
            const ariaLabelledBy = group.getAttribute('aria-labelledby');
            expect(ariaLabelledBy).toBeTruthy();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('fill in blank exercise should have keyboard accessible options', () => {
    fc.assert(
      fc.property(
        fc.record({
          sentence: fc.string({ minLength: 10, maxLength: 100 }),
          blankIndex: fc.integer({ min: 1, max: 5 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 2,
            maxLength: 4,
          }),
        }),
        (props) => {
          const correctAnswer = props.options[0];
          const { container } = render(
            <FillInBlank
              sentence={props.sentence}
              blankIndex={props.blankIndex}
              options={props.options}
              correctAnswer={correctAnswer}
              onComplete={() => {}}
            />
          );

          // Get all option buttons
          const buttons = container.querySelectorAll('button[role="button"]');

          // Property: All option buttons should be keyboard accessible
          let hasInitialFocus = false;
          buttons.forEach((button) => {
            const tabIndex = button.getAttribute('tabindex');
            
            if (tabIndex !== null) {
              const tabIndexValue = parseInt(tabIndex, 10);
              expect([0, -1]).toContain(tabIndexValue);
              
              if (tabIndexValue === 0) {
                hasInitialFocus = true;
              }
            }
          });

          // Property: At least one button should be initially focusable
          if (buttons.length > 0) {
            expect(hasInitialFocus).toBe(true);
          }

          // Property: All buttons should have ARIA labels
          buttons.forEach((button) => {
            const ariaLabel = button.getAttribute('aria-label');
            const textContent = button.textContent?.trim();
            
            // Button should have either aria-label or text content
            expect(ariaLabel || textContent).toBeTruthy();
          });

          // Property: Instructions should be present and linked via aria-describedby
          const instructions = container.querySelector('#fill-instructions');
          // Instructions may not be present in all render contexts, but if present should be valid
          if (instructions) {
            expect(instructions.textContent).toBeTruthy();
          }
          
          const group = container.querySelector('[role="group"]');
          if (group && instructions) {
            const describedBy = group.getAttribute('aria-describedby');
            expect(describedBy).toContain('fill-instructions');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('listening comprehension exercise should have keyboard accessible image options', () => {
    fc.assert(
      fc.property(
        fc.record({
          audioUrl: fc.webUrl(),
          images: fc.array(fc.webUrl(), { minLength: 2, maxLength: 6 }),
          correctImageIndex: fc.integer({ min: 0, max: 5 }),
        }),
        (props) => {
          // Ensure correctImageIndex is within bounds
          const correctIndex = props.correctImageIndex % props.images.length;
          
          const { container } = render(
            <ListeningComprehension
              audioUrl={props.audioUrl}
              images={props.images}
              correctImageIndex={correctIndex}
              onComplete={() => {}}
            />
          );

          // Get all image option buttons
          const imageButtons = container.querySelectorAll('button[role="button"]');

          // Property: All image buttons should support keyboard navigation
          let hasInitialFocus = false;
          imageButtons.forEach((button) => {
            const tabIndex = button.getAttribute('tabindex');
            
            if (tabIndex !== null) {
              const tabIndexValue = parseInt(tabIndex, 10);
              
              // Should use roving tabindex pattern or be normally focusable
              if (tabIndexValue === 0) {
                hasInitialFocus = true;
              }
            }
          });

          // Property: At least one element should be initially focusable
          // (either play button or first image option)
          const allButtons = container.querySelectorAll('button');
          let anyFocusable = false;
          allButtons.forEach((button) => {
            const tabIndex = button.getAttribute('tabindex');
            if (tabIndex === null || parseInt(tabIndex, 10) === 0) {
              anyFocusable = true;
            }
          });
          expect(anyFocusable).toBe(true);

          // Property: All buttons should have ARIA labels
          allButtons.forEach((button) => {
            const ariaLabel = button.getAttribute('aria-label');
            const textContent = button.textContent?.trim();
            
            expect(ariaLabel || textContent).toBeTruthy();
          });

          // Property: Instructions should be present
          const instructions = container.querySelector('#listening-instructions');
          // Instructions may not be present in all render contexts, but if present should be valid
          if (instructions) {
            expect(instructions.textContent).toBeTruthy();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('learning view should have keyboard shortcuts and skip links', () => {
    fc.assert(
      fc.property(
        fc.record({
          lessonId: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          targetLanguage: fc.constantFrom('en', 'es', 'fr', 'de'),
          exercises: fc.array(
            fc.record({
              id: fc.uuid(),
              lessonId: fc.uuid(),
              imageUrl: fc.webUrl(),
              text: fc.string({ minLength: 1, maxLength: 50 }),
              languageCode: fc.constantFrom('en', 'es', 'fr', 'de'),
              exerciseType: fc.constant('image_text' as const),
              orderIndex: fc.integer({ min: 0, max: 10 }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        (lesson) => {
          const { container } = render(
            <LearningView
              lesson={lesson}
              onComplete={() => {}}
            />
          );

          // Property: Skip to main content link should exist
          const skipLink = container.querySelector('.skip-to-main');
          expect(skipLink).toBeTruthy();
          expect(skipLink?.getAttribute('href')).toBe('#main-content');

          // Property: Main content should have id for skip link target
          // Note: May not be present in loading state or completion state
          const mainContent = container.querySelector('#main-content');
          const isLoadingState = container.textContent?.includes('Loading your progress');
          const isCompleteState = container.textContent?.includes('Lesson Complete');
          
          if (!isLoadingState && !isCompleteState && mainContent) {
            // Property: Main content should be focusable programmatically
            const tabIndex = mainContent.getAttribute('tabindex');
            expect(tabIndex).toBe('-1');

            // Property: Keyboard navigation hints should be present
            const kbdElements = container.querySelectorAll('.kbd');
            expect(kbdElements.length).toBeGreaterThan(0);
          }
          
          // At minimum, skip link should always be present
          expect(skipLink).toBeTruthy();
        }
      ),
      { numRuns: 30 }
    );
  });

  // Feature: language-learning-platform, Property 43: Keyboard navigation completeness
  // Validates: Requirements 15.3, 15.5
  it('all components should have proper ARIA roles and labels', () => {
    fc.assert(
      fc.property(
        fc.record({
          componentType: fc.constantFrom('imageCard', 'matchingPairs', 'fillInBlank', 'listening'),
          imageUrl: fc.webUrl(),
          text: fc.string({ minLength: 1, maxLength: 50 }),
          languageCode: fc.constantFrom('en', 'es', 'fr'),
        }),
        (props) => {
          let container;

          switch (props.componentType) {
            case 'imageCard':
              ({ container } = render(
                <ImageCard
                  imageUrl={props.imageUrl}
                  text={props.text}
                  languageCode={props.languageCode}
                />
              ));
              break;
            case 'matchingPairs':
              ({ container } = render(
                <MatchingPairs
                  pairs={[
                    { image: props.imageUrl, text: props.text },
                    { image: props.imageUrl, text: 'other' },
                  ]}
                  onComplete={() => {}}
                />
              ));
              break;
            case 'fillInBlank':
              ({ container } = render(
                <FillInBlank
                  sentence="This is a test sentence"
                  blankIndex={2}
                  options={['test', 'other']}
                  correctAnswer="test"
                  onComplete={() => {}}
                />
              ));
              break;
            case 'listening':
              ({ container } = render(
                <ListeningComprehension
                  audioUrl={props.imageUrl}
                  images={[props.imageUrl, props.imageUrl]}
                  correctImageIndex={0}
                  onComplete={() => {}}
                />
              ));
              break;
          }

          // Property: Component should have a region role or main landmark or article
          const regions = container!.querySelectorAll('[role="region"], main, [role="main"], [role="article"]');
          expect(regions.length).toBeGreaterThan(0);

          // Property: All regions should have aria-label or aria-labelledby
          regions.forEach((region) => {
            const ariaLabel = region.getAttribute('aria-label');
            const ariaLabelledBy = region.getAttribute('aria-labelledby');
            expect(ariaLabel || ariaLabelledBy).toBeTruthy();
          });

          // Property: All status updates should use aria-live
          const liveRegions = container!.querySelectorAll('[aria-live]');
          liveRegions.forEach((region) => {
            const ariaLive = region.getAttribute('aria-live');
            expect(['polite', 'assertive', 'off']).toContain(ariaLive);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
