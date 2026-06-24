# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Git

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

The application will start on `http://localhost:8080`

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run preview` - Preview production build locally

### Building
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode (with source maps)

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is formatted correctly
- `npm run type-check` - Run TypeScript compiler without emitting

### Testing
- `npm run test` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI dashboard
- `npm run test:coverage` - Generate coverage reports

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── auth/            # Authentication components
│   ├── chat/            # Chat-related components
│   ├── error/           # Error handling components
│   ├── loading/         # Loading state components
│   ├── theme/           # Theme management
│   ├── engineering/     # Engineering tools
│   ├── integrations/    # Integration components
│   └── services/        # Service-specific components
├── pages/               # Page components (routes)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
│   ├── utils.ts         # General utilities
│   ├── error-handler.ts # Error handling
│   ├── a11y-utils.ts    # Accessibility utilities
│   └── ...other libs
├── integrations/        # External service integrations
├── types/               # TypeScript type definitions
├── test/                # Test setup and utilities
└── App.tsx              # Root component
```

## Code Standards

### TypeScript
- Strict mode is enabled
- All files must have proper type annotations
- Use `unknown` instead of `any` when type is uncertain
- Avoid non-null assertions (`!`) unless absolutely necessary

### React Components
- Prefer functional components with hooks
- Use TypeScript interfaces for props
- Export components from index files for cleaner imports
- Keep components focused and single-responsibility

### Styling
- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional class names
- Respect the design system (colors, spacing, typography)
- Support dark mode with Tailwind's dark prefix

### Testing
- Write tests for utilities and custom hooks
- Test component behavior, not implementation
- Use `@testing-library/react` for component tests
- Aim for >60% code coverage

### Error Handling
- Use `ErrorBoundary` to wrap components
- Use `ErrorAlert` for user-facing errors
- Use `handleError()` utility for error logging
- Provide meaningful error messages

## Best Practices

### Performance
- Lazy load heavy components with React.lazy()
- Use React Query for server state management
- Memoize expensive computations with useMemo
- Use useCallback for event handlers passed to children

### Accessibility (a11y)
- Include ARIA labels for interactive elements
- Test with keyboard navigation
- Ensure sufficient color contrast
- Use semantic HTML elements

### Security
- Never store sensitive data in localStorage
- Validate inputs on both client and server
- Use environment variables for API keys
- Implement proper authentication checks

## Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/your-feature`
4. Create a Pull Request

### Commit Conventions
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

## Environment Variables

Create a `.env.local` file (not committed to git):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AZURE_API_KEY=your_azure_api_key
VITE_AZURE_ENDPOINT=your_azure_endpoint
```

## Troubleshooting

### Port Already in Use
```bash
# Change the port in vite.config.ts or kill the process
npx kill-port 8080
```

### Node Modules Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Check for type errors
npm run type-check

# Fix issues with ESLint
npm run lint:fix
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Testing Library](https://testing-library.com)
- [Vitest Documentation](https://vitest.dev)
