export class SessionError extends Error {
  constructor(
    message: string,
    public code: 'USER_NOT_LOADED' | 'SESSION_CREATE_FAILED' | 'SESSION_NOT_FOUND' | 'NETWORK_ERROR',
    public retry?: boolean
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof SessionError && error.retry === true;
}

export function createSessionError(
  error: unknown, 
  defaultMessage: string = 'An error occurred', 
  defaultCode: SessionError['code'] = 'NETWORK_ERROR'
): SessionError {
  if (error instanceof SessionError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : defaultMessage;
  return new SessionError(message, defaultCode, true);
} 