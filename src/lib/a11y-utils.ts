/**
 * Accessibility utility functions for WCAG 2.1 Level AA compliance
 */

/**
 * Check if a color contrast ratio meets WCAG standards
 */
export function getContrastRatio(rgb1: string, rgb2: string): number {
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(x => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const parseRgb = (rgb: string): [number, number, number] => {
    const match = rgb.match(/\d+/g);
    return match ? [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])] : [0, 0, 0];
  };

  const [r1, g1, b1] = parseRgb(rgb1);
  const [r2, g2, b2] = parseRgb(rgb2);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Handle keyboard navigation for menu items
 */
export function handleMenuKeyDown(
  event: React.KeyboardEvent,
  options: {
    onArrowDown?: () => void;
    onArrowUp?: () => void;
    onEnter?: () => void;
    onEscape?: () => void;
  }
) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      options.onArrowDown?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      options.onArrowUp?.();
      break;
    case 'Enter':
      event.preventDefault();
      options.onEnter?.();
      break;
    case 'Escape':
      event.preventDefault();
      options.onEscape?.();
      break;
  }
}

/**
 * Get ARIA labels for common UI patterns
 */
export const AriaLabels = {
  close: 'Close dialog',
  menu: 'Open menu',
  search: 'Search',
  submit: 'Submit form',
  cancel: 'Cancel',
  delete: 'Delete',
  loading: 'Loading',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
  info: 'Information',
} as const;

/**
 * Skip link component helper for keyboard navigation
 */
export function useSkipLink(targetId: string) {
  return {
    href: `#${targetId}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
  };
}

/**
 * Create accessible form error messages
 */
export function getFieldErrorId(fieldName: string): string {
  return `${fieldName}-error`;
}

export function getFieldErrorAttributes(fieldName: string) {
  return {
    'aria-describedby': getFieldErrorId(fieldName),
    'aria-invalid': true as const,
  };
}

/**
 * Announce screen reader updates
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
}
