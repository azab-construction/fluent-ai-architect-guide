import { toast } from 'sonner';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

export function handleError(
  error: unknown,
  options: {
    showToast?: boolean;
    logError?: boolean;
    context?: string;
  } = {}
): AppError {
  const {
    showToast = true,
    logError = true,
    context = 'Error',
  } = options;

  const message = getErrorMessage(error);
  const appError = isAppError(error)
    ? error
    : new AppError('UNKNOWN_ERROR', message);

  if (logError) {
    console.error(`[${context}]`, appError);
  }

  if (showToast) {
    toast.error(message, {
      duration: 5000,
    });
  }

  return appError;
}

export function handleSuccess(
  message: string,
  options: { duration?: number } = {}
) {
  toast.success(message, {
    duration: options.duration ?? 3000,
  });
}

// Common error constructors
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export const createError = (
  code: keyof typeof ErrorCodes,
  message: string,
  statusCode: number = 500
) => new AppError(ErrorCodes[code], message, statusCode);
