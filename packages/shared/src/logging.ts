// ===========================================================================
// Minimal structured logger. Swappable/injectable, no hard dependency.
// ===========================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  tenantId?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

class ConsoleLogger implements Logger {
  private readonly threshold = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private readonly bindings: Record<string, unknown>;

  constructor(bindings: Record<string, unknown> = {}) {
    this.bindings = bindings;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.threshold]) return;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.bindings,
      ...(meta || {}),
    };
    const line = `[${entry.timestamp}] ${level.toUpperCase()} ${message} ${JSON.stringify(entry)}`;
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }
  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings });
  }
}

let globalLogger: Logger = new ConsoleLogger();

export function createLogger(bindings?: Record<string, unknown>): Logger {
  return new ConsoleLogger(bindings);
}

export function getGlobalLogger(): Logger {
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
