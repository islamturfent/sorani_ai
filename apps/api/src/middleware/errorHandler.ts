import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, getGlobalLogger } from '@sorani/shared';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId: (req as Request & { requestId?: string }).requestId,
    });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  getGlobalLogger().error('http.unhandled', { message });
  res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message },
    requestId: (req as Request & { requestId?: string }).requestId,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export { ValidationError };
