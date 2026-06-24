import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Button } from '../button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button');
    button.click();
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should apply variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('should apply size classes', () => {
    render(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-11');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should support different variants', () => {
    const { rerender } = render(<Button variant="outline">Button</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('border');

    rerender(<Button variant="ghost">Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-accent');
  });
});
