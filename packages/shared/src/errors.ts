// ===========================================================================
// Error taxonomy shared across the platform.
// ===========================================================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_FAILED'
  | 'AVAILABILITY_NOT_FOUND'
  | 'RESERVATION_CONFLICT'
  | 'DUPLICATE_RESERVATION'
  | 'CALL_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class TenantMismatchError extends ForbiddenError {
  constructor(message = 'Tenant isolation violation') {
    super(message);
    this.name = 'TenantMismatchError';
  }
}

/** Raised when a provider fails to fulfil an operation. */
export class ProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super('PROVIDER_ERROR', message, 502, details);
    this.name = 'ProviderError';
  }
}

/** Raised when a provider is down/unavailable and cannot be used. */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, details?: unknown) {
    super(`Provider "${provider}" is unavailable`, details);
    this.name = 'ProviderUnavailableError';
  }
}

/** Raised when a provider returns an operational failure (may retry via fallback). */
export class ProviderFailedError extends ProviderError {
  constructor(provider: string, details?: unknown) {
    super(`Provider "${provider}" failed to complete the operation`, details);
    this.name = 'ProviderFailedError';
  }
}

/** Duplicate reservation guard triggered by an idempotency key. */
export class DuplicateReservationError extends AppError {
  constructor(message = 'Duplicate reservation request detected') {
    super('DUPLICATE_RESERVATION', message, 409);
    this.name = 'DuplicateReservationError';
  }
}

export class ReservationConflictError extends AppError {
  constructor(message: string) {
    super('RESERVATION_CONFLICT', message, 409);
    this.name = 'ReservationConflictError';
  }
}
