# Developer Checklist

Use this checklist when contributing to ensure quality and consistency.

## Before Starting

- [ ] Create a feature branch: `git checkout -b feature/your-feature`
- [ ] Pull latest changes: `git pull origin main`
- [ ] Install dependencies: `npm install`
- [ ] Read relevant docs: DEVELOPMENT.md, ARCHITECTURE.md
- [ ] Understand the feature requirements

## While Coding

### TypeScript & Type Safety
- [ ] Use explicit types for all function parameters
- [ ] Avoid using `any` type (use `unknown` instead if necessary)
- [ ] Add return type annotations to functions
- [ ] Run `npm run type-check` frequently
- [ ] Use interfaces for component props

### Components
- [ ] Export components from index files
- [ ] Keep components focused and single-responsibility
- [ ] Use TypeScript interfaces for props
- [ ] Add JSDoc comments for public APIs
- [ ] Support dark mode (use Tailwind dark: prefix)

### State Management
- [ ] Use React Query for server state
- [ ] Use Context + hooks for app state
- [ ] Use local state for UI state
- [ ] Avoid prop drilling (use context when needed)

### Error Handling
- [ ] Wrap feature components with ErrorBoundary
- [ ] Use ErrorAlert for user-facing errors
- [ ] Use handleError() for error logging
- [ ] Provide meaningful error messages
- [ ] Handle loading and error states

### Accessibility
- [ ] Include aria-label for icon buttons
- [ ] Use semantic HTML (button, link, form, etc.)
- [ ] Test with keyboard navigation
- [ ] Ensure color contrast (WCAG 2.1 AA)
- [ ] Use descriptive link text (avoid "click here")

### Styling
- [ ] Use Tailwind utility classes
- [ ] Use `cn()` for conditional classes
- [ ] Support dark mode
- [ ] Keep consistent spacing
- [ ] Avoid inline styles

### Performance
- [ ] Lazy load heavy components with React.lazy()
- [ ] Memoize expensive computations
- [ ] Use useCallback for event handlers
- [ ] Check React Query staleTime/gcTime settings
- [ ] Avoid unnecessary re-renders

## Testing

- [ ] Write tests for new utilities
- [ ] Write tests for new hooks
- [ ] Write tests for new components (critical paths)
- [ ] Test user interactions, not implementation
- [ ] Use accessibility queries (getByRole, getByLabelText)
- [ ] Aim for 60%+ coverage
- [ ] Run `npm run test` - all tests pass
- [ ] Run `npm run test:coverage` to check coverage

## Code Quality

- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run lint:fix` to auto-fix issues
- [ ] Run `npm run format` to format code
- [ ] Add descriptive commit messages
- [ ] Remove console.log statements (except [v0] debug logs)
- [ ] Remove TODO comments (use GitHub issues instead)

## Before Submitting PR

- [ ] All tests pass: `npm run test`
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Format check passes: `npm run format:check`
- [ ] Build succeeds: `npm run build`
- [ ] Code is reviewed for quality
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] No console errors/warnings (except intentional)

## Commit Checklist

- [ ] Follow commit convention (feat:, fix:, docs:, etc.)
- [ ] Write descriptive commit message
- [ ] Reference related issues if applicable
- [ ] Keep commits small and focused
- [ ] Test the commit individually

## PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Changes
- Change 1
- Change 2

## Testing
Describe how you tested this

## Screenshots (if applicable)
Add relevant screenshots

## Related Issues
Closes #123
```

## Code Review Checklist

When reviewing PRs, check:

- [ ] Code follows project conventions
- [ ] Tests are comprehensive
- [ ] Types are properly defined
- [ ] Error handling is appropriate
- [ ] Accessibility is considered
- [ ] Dark mode is supported
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Documentation is updated
- [ ] No merge conflicts

## Common Patterns to Follow

### Creating a Custom Hook
```typescript
import { useState, useEffect } from 'react';

interface UseMyHookOptions {
  // Options here
}

interface UseMyHookResult {
  // Result here
}

export function useMyHook(options: UseMyHookOptions): UseMyHookResult {
  // Implementation
  return { /* result */ };
}
```

### Creating a Component
```typescript
import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'base-styles',
        variant === 'outline' && 'outline-styles',
        size === 'lg' && 'large-styles',
        className
      )}
      {...props}
    />
  )
);

MyComponent.displayName = 'MyComponent';
```

### Creating a Test
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent>Test</MyComponent>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    await screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Error Handling
```typescript
import { handleError, handleSuccess } from '@/lib/error-handler';

try {
  await apiCall();
  handleSuccess('Operation successful');
} catch (error) {
  handleError(error, {
    showToast: true,
    context: 'MyFeature'
  });
}
```

### Using ErrorBoundary
```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export function MyFeature() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run preview          # Preview production build

# Quality checks
npm run type-check       # TypeScript check
npm run lint            # ESLint check
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code
npm run format:check    # Check formatting

# Testing
npm run test            # Run tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage

# Build
npm run build           # Build for production
npm run build:dev       # Build in dev mode
```

## Resources

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [TESTING.md](./TESTING.md) - Testing guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Testing Library](https://testing-library.com)

## Questions?

- Check the documentation files
- Ask in team chat
- Create a discussion issue
- Review similar implementations in the codebase

---

**Remember: Code quality and testing are not optional. They protect the team and the project.**
