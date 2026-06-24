import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    const result = cn(
      'px-2',
      true && 'py-1',
      false && 'hidden'
    );
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
    expect(result).not.toContain('hidden');
  });

  it('should resolve tailwind merge conflicts', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('should handle empty inputs', () => {
    const result = cn('');
    expect(result).toBe('');
  });

  it('should work with undefined values', () => {
    const result = cn('px-2', undefined, 'py-1');
    expect(result).toBe('px-2 py-1');
  });
});
