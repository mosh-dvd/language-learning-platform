/**
 * Frontend Logger Service
 * Provides structured logging for client-side errors, speech API usage, and performance monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

export interface SpeechAPIUsage {
  type: 'tts' | 'stt';
  text?: string;
  languageCode: string;
  success: boolean;
  error?: string;
  duration?: number;
  cached?: boolean;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  metadata?: Record<string, any>;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private logLevel: LogLevel = 'info';
  private enableConsole = true;
  private enableRemote = false;
  private remoteEndpoint?: string;

  constructor() {
    // Set log level from environment or localStorage
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel;
    const storedLogLevel = localStorage.getItem('logLevel') as LogLevel;
    this.logLevel = envLogLevel || storedLogLevel || 'info';

    // Enable remote logging in production
    this.enableRemote = import.meta.env.PROD;
    this.remoteEndpoint = import.meta.env.VITE_LOG_ENDPOINT;

    // Set up global error handler
    this.setupGlobalErrorHandler();
  }

  /**
   * Set up global error handler to catch unhandled errors
   */
  private setupGlobalErrorHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
      });
    });
  }

  /**
   * Check if a log level should be logged based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    return entry;
  }

  /**
   * Store log entry
   */
  private storeLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (this.enableConsole) {
      this.logToConsole(entry);
    }

    // Remote logging
    if (this.enableRemote && this.remoteEndpoint) {
      this.sendToRemote(entry);
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, context, error } = entry;
    const logMessage = `[${entry.timestamp}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage, context, error);
        break;
      case 'info':
        console.info(logMessage, context);
        break;
      case 'warn':
        console.warn(logMessage, context);
        break;
      case 'error':
        console.error(logMessage, context, error);
        break;
    }
  }

  /**
   * Send log to remote endpoint
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.remoteEndpoint) return;

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Silently fail - don't want logging to break the app
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.createLogEntry('debug', message, context);
    this.storeLog(entry);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    const entry = this.createLogEntry('info', message, context);
    this.storeLog(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.createLogEntry('warn', message, context);
    this.storeLog(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog('error')) return;
    const entry = this.createLogEntry('error', message, context, error);
    this.storeLog(entry);
  }

  /**
   * Log speech API usage (TTS/STT)
   */
  logSpeechAPIUsage(usage: SpeechAPIUsage): void {
    const { type, text, languageCode, success, error, duration, cached } = usage;

    this.info(`Speech API ${type.toUpperCase()} ${success ? 'success' : 'failure'}`, {
      type,
      textLength: text?.length,
      languageCode,
      success,
      error,
      duration,
      cached,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: PerformanceMetric): void {
    this.debug(`Performance: ${metric.name}`, {
      duration: metric.duration,
      ...metric.metadata,
    });
  }

  /**
   * Log component error
   */
  logComponentError(
    componentName: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    this.error(`Error in ${componentName}`, { ...context, componentName }, error);
  }

  /**
   * Log API request
   */
  logAPIRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    error?: Error
  ): void {
    if (error || status >= 400) {
      this.error('API request failed', {
        method,
        url,
        status,
        duration,
      }, error);
    } else {
      this.debug('API request', {
        method,
        url,
        status,
        duration,
      });
    }
  }

  /**
   * Log user action
   */
  logUserAction(action: string, context?: Record<string, any>): void {
    this.info(`User action: ${action}`, context);
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    localStorage.setItem('logLevel', level);
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs(): void {
    const logsJson = this.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const logger = new LoggerService();
