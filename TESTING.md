# Testing Guide

## Overview

This project uses **Vitest** for unit testing and **@testing-library/react** for component testing. Tests are organized alongside source code in `__tests__` directories.

## Setup

Tests are automatically configured via `vitest.config.ts` with:
- jsdom environment for DOM testing
- Global test APIs (no imports needed)
- Automatic cleanup after each test
- Path aliases matching the main config

## Running Tests

```bash
# Run tests once
npm run test

# Run tests in watch mode (default)
npm run test

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Writing Tests

### Test File Structure

Create `__tests__` directory next to the file being tested:

```
src/
└── components/
    ├── Button.tsx
    └── __tests__/
        └── Button.test.tsx
```

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Button } from '../Button';

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
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

describe('useAuth', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it('should update state when user logs in', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      // Simulate login
    });
    
    expect(result.current.user).toBeDefined();
  });
});
```

### Testing Utilities

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('myFunction', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize mocks or state
  });

  // Cleanup after each test
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

## Test Utilities

### Custom Render Function

The `render` function from `@/test/test-utils` includes providers:
- QueryClientProvider
- BrowserRouter
- Custom query client with testing defaults

```typescript
import { render, screen } from '@/test/test-utils';

// Automatically includes all providers
render(<MyComponent />);
```

### Query Methods

```typescript
// Get by role (preferred)
screen.getByRole('button', { name: /submit/i })

// Get by label text
screen.getByLabelText('Username')

// Get by placeholder
screen.getByPlaceholderText('Enter name')

// Get by text
screen.getByText('Welcome')

// Query variants (throws if not found)
getByRole, getByLabelText, getByText

// Query variants (returns null if not found)
queryByRole, queryByLabelText, queryByText

// Async variants (for async content)
findByRole, findByLabelText, findByText
```

### User Interactions

```typescript
import { userEvent } from '@testing-library/user-event';

it('should update on input change', async () => {
  const user = userEvent.setup();
  render(<Input />);
  
  const input = screen.getByRole('textbox');
  await user.type(input, 'hello');
  expect(input).toHaveValue('hello');
});
```

## Testing Best Practices

### Test User Behavior, Not Implementation

❌ Bad:
```typescript
it('should call setState', () => {
  const setState = vi.fn();
  // Testing internal implementation
});
```

✅ Good:
```typescript
it('should display success message when submitted', () => {
  render(<Form />);
  const input = screen.getByLabelText('Email');
  const button = screen.getByRole('button');
  
  await userEvent.type(input, 'test@example.com');
  await userEvent.click(button);
  
  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

### Use Accessibility Queries

❌ Avoid:
```typescript
screen.getByTestId('submit-button')
screen.getByClassName('btn-primary')
```

✅ Prefer:
```typescript
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Accept')
```

### Mock External Dependencies

```typescript
import { vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

it('should call API', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ data: 'test' }),
  });
  
  // Test code
  
  expect(mockFetch).toHaveBeenCalledWith('/api/data');
});
```

## Coverage Goals

- **Overall:** 60%+ coverage
- **Utilities:** 80%+ coverage
- **Components:** 70%+ coverage for critical paths
- **Hooks:** 80%+ coverage

## Debugging Tests

### View DOM State
```typescript
import { screen, debug } from '@testing-library/react';

it('should render correctly', () => {
  render(<Component />);
  
  // Print current DOM
  screen.debug();
  
  // Print specific element
  debug(screen.getByRole('button'));
});
```

### Use Testing Playground
```typescript
import { screen } from '@testing-library/react';

it('should find element', () => {
  render(<Component />);
  
  // Opens browser to help you select elements
  screen.logTestingPlaygroundURL();
});
```

## Continuous Integration

Tests run automatically in CI/CD. Ensure:
- All tests pass: `npm run test`
- No ESLint issues: `npm run lint`
- TypeScript builds: `npm run type-check`
- Code is formatted: `npm run format:check`

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
