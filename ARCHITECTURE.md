# Architecture Guide

## Overview

Fluent AI Architect Guide is a modern React application built with TypeScript, Vite, and Tailwind CSS. It integrates with Supabase for authentication and database management, and Azure AI services for advanced features.

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router v6** - Routing
- **React Query** - Server state management
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend Services
- **Supabase** - Authentication & database
- **Azure AI Services** - Vision, Document Intelligence, Search
- **WhatsApp API** - Messaging integration

### Development Tools
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript ESLint** - Type-aware linting

## Architecture Patterns

### Component Structure

#### Smart Components (Pages)
Located in `src/pages/`, these components:
- Handle routing logic
- Fetch and manage data
- Connect to stores/hooks
- Dispatch actions

Example:
```typescript
export default function Dashboard() {
  const { data, isLoading } = useQuery(['dashboard'], fetchData);
  
  return <DashboardContent data={data} isLoading={isLoading} />;
}
```

#### Presentational Components (UI)
Located in `src/components/ui/`, these components:
- Are highly reusable
- Accept data via props
- Have no business logic
- Are easily testable

Example:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant, size, ...props }: ButtonProps) {
  // Implementation
}
```

#### Feature Components
Located in `src/components/{feature}/`, these components:
- Combine multiple presentational components
- Handle feature-specific logic
- May connect to context or hooks
- Are domain-specific

Example:
```typescript
export function ChatInterface() {
  const { messages, sendMessage } = useChat();
  const { user } = useAuth();
  
  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

### State Management

#### React Query
Used for server state (data from APIs):
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### React Context + Hooks
Used for application state (theme, auth, user preferences):
```typescript
export const ThemeContext = createContext<Theme | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be within ThemeProvider');
  return context;
}
```

#### Local Component State
Used for UI state (form inputs, modals, dropdowns):
```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({ name: '', email: '' });
```

### Error Handling

#### Error Boundary
Catches React component errors:
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### Error Alert
Shows user-friendly error messages:
```typescript
<ErrorAlert
  title="Failed to load"
  description="Could not fetch data. Please try again."
  onRetry={refetch}
/>
```

#### Error Utilities
Centralized error handling:
```typescript
import { handleError, createError } from '@/lib/error-handler';

try {
  await apiCall();
} catch (error) {
  handleError(error, { showToast: true, context: 'ApiCall' });
}
```

### Authentication Flow

1. **ProtectedRoute** checks if user is authenticated
2. **useAuth** hook provides user state and methods
3. **Supabase Auth** manages sessions
4. **RLS Policies** ensure data security

```typescript
export function ProtectedRoute({ children }) {
  const { loading, session } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/auth" />;
  
  return children;
}
```

### Data Flow

```
User Action
    ↓
Event Handler
    ↓
API Call / Database Query
    ↓
React Query / State Update
    ↓
Component Re-render
    ↓
UI Update
```

## Folder Structure Deep Dive

### `/src/components`
```
components/
├── ui/                    # shadcn/ui + custom base components
│   ├── button.tsx
│   ├── input.tsx
│   └── __tests__/
├── auth/                  # Authentication related
│   └── ProtectedRoute.tsx
├── chat/                  # Chat feature components
│   └── ChatInterface.tsx
├── error/                 # Error handling
│   ├── ErrorBoundary.tsx
│   └── ErrorAlert.tsx
├── loading/               # Loading states
│   ├── Skeleton.tsx
│   └── PageLoader.tsx
├── theme/                 # Theme management
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── integrations/          # Integration components
├── engineering/           # Engineering tools
└── services/              # Service-specific components
```

### `/src/lib`
```
lib/
├── utils.ts              # General utilities (cn, etc.)
├── error-handler.ts      # Error handling logic
├── a11y-utils.ts         # Accessibility utilities
├── api-client.ts         # Centralized API calls
└── __tests__/            # Unit tests for utilities
```

### `/src/hooks`
```
hooks/
├── useAuth.tsx           # Authentication hook
├── useQuery.ts           # Data fetching
├── useLocalStorage.ts    # Local storage
└── __tests__/            # Hook tests
```

### `/src/integrations`
```
integrations/
├── supabase/
│   └── client.ts         # Supabase client
├── azure/                # Azure AI services
└── whatsapp/             # WhatsApp integration
```

## Data Flow Architecture

### Client → Server
```
Component
  ↓
React Query Hook
  ↓
API Call (fetch/axios)
  ↓
Backend Service
```

### Server → Client
```
Database / External API
  ↓
Backend Handler
  ↓
HTTP Response
  ↓
React Query Caching
  ↓
Component Re-render
```

### State Synchronization
```
Supabase Realtime
  ↓
WebSocket Connection
  ↓
State Update
  ↓
Component Subscription
  ↓
UI Refresh
```

## Performance Considerations

### Code Splitting
Routes are lazy-loaded:
```typescript
const Dashboard = lazy(() => import('@/pages/Dashboard'));
```

### Memoization
Expensive computations are memoized:
```typescript
const memoizedValue = useMemo(() => expensiveCalc(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a), [a]);
```

### Query Caching
React Query caches and deduplicates requests:
```typescript
useQuery({
  queryKey: ['users'],
  staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
  gcTime: 10 * 60 * 1000,   // Remove from cache after 10 minutes
});
```

## Security

### Authentication
- Supabase handles user authentication
- JWT tokens stored in secure HTTP-only cookies
- Sessions validated on protected routes

### Database Security
- Row Level Security (RLS) policies enforce access control
- Authenticated users can only access their own data
- Sensitive operations require additional verification

### API Security
- Environment variables for API keys
- CORS policies configured
- Input validation on all endpoints

## Testing Strategy

### Unit Tests
- Test utilities and helper functions
- Aim for 80%+ coverage of pure functions
- Mock external dependencies

### Component Tests
- Test user interactions
- Test with actual DOM (jsdom)
- Use accessibility queries

### Integration Tests
- Test feature workflows
- Test API integrations
- Test state synchronization

## Deployment

### Build Process
```bash
npm run build
```
Outputs optimized bundle to `dist/`

### Environment Configuration
```
.env.local
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### CI/CD Pipeline
- Lint and type-check code
- Run tests
- Build application
- Deploy to Vercel/hosting

## Future Enhancements

- [ ] Offline support with Service Workers
- [ ] Real-time collaboration features
- [ ] Advanced caching strategies
- [ ] Performance monitoring
- [ ] Internationalization (i18n)
- [ ] Micro-frontends architecture
