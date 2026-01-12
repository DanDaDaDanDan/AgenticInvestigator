#!/usr/bin/env node
/**
 * logger.js - Shared logging utility for investigation scripts
 *
 * Provides consistent logging across all scripts with:
 * - Timestamps
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - File logging with automatic rotation
 * - Color output (when not piped)
 *
 * Environment variables:
 *   LOG_LEVEL=debug|info|warn|error (default: debug for visibility)
 *   LOG_FILE=path/to/file.log (optional, enables file logging)
 *   LOG_TIMESTAMPS=true|false (default: true)
 *   LOG_MAX_SIZE=10485760 (max file size before rotation, default 10MB)
 *   LOG_MAX_FILES=5 (number of rotated files to keep, default 5)
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('Processing started');
 *   logger.debug('Details:', { foo: 'bar' });
 *   logger.warn('Potential issue');
 *   logger.error('Something failed', error);
 *
 * Operation tracking:
 *   const op = logger.operation('taskName', { details });
 *   try {
 *     // ... do work ...
 *     op.success({ result });
 *   } catch (e) {
 *     op.fail(e);
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Log levels with numeric values for comparison
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  timestamp: '\x1b[90m' // gray
};

// Check if we should use colors (not when piped)
const useColors = process.stdout.isTTY && !process.env.NO_COLOR;

// Configuration from environment
const config = {
  level: (process.env.LOG_LEVEL || 'debug').toLowerCase(),  // Default to debug for visibility
  file: process.env.LOG_FILE || null,
  timestamps: process.env.LOG_TIMESTAMPS !== 'false',
  maxFileSize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),  // 10MB default
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)  // Keep 5 rotated files
};

// File stream for logging with rotation
let fileStream = null;
let currentFileSize = 0;

/**
 * Rotate log files when size limit reached
 */
function rotateLogFile() {
  if (!config.file) return;

  try {
    // Close current stream
    if (fileStream) {
      fileStream.end();
      fileStream = null;
    }

    // Rotate existing files (file.4.log -> deleted, file.3.log -> file.4.log, etc.)
    for (let i = config.maxFiles - 1; i >= 0; i--) {
      const oldPath = i === 0 ? config.file : `${config.file}.${i}`;
      const newPath = `${config.file}.${i + 1}`;

      if (fs.existsSync(oldPath)) {
        if (i === config.maxFiles - 1) {
          fs.unlinkSync(oldPath);  // Delete oldest
        } else {
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    // Open new stream
    fileStream = fs.createWriteStream(config.file, { flags: 'a' });
    currentFileSize = 0;
  } catch (e) {
    console.error(`[logger] Failed to rotate log file: ${e.message}`);
  }
}

/**
 * Check file size and rotate if needed
 */
function checkRotation(bytesWritten) {
  currentFileSize += bytesWritten;
  if (currentFileSize >= config.maxFileSize) {
    rotateLogFile();
  }
}

if (config.file) {
  try {
    const logDir = path.dirname(config.file);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fileStream = fs.createWriteStream(config.file, { flags: 'a' });

    // Get current file size for rotation tracking
    if (fs.existsSync(config.file)) {
      currentFileSize = fs.statSync(config.file).size;
    }
  } catch (e) {
    console.error(`[logger] Failed to open log file: ${e.message}`);
  }
}

/**
 * Format a log message
 */
function formatMessage(level, scriptName, args) {
  const timestamp = config.timestamps ? new Date().toISOString() : '';
  const levelUpper = level.toUpperCase().padEnd(5);
  const script = scriptName ? `[${scriptName}]` : '';

  // Convert args to string
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  return { timestamp, levelUpper, script, message };
}

/**
 * Write to console with colors
 */
function writeConsole(level, formatted) {
  const { timestamp, levelUpper, script, message } = formatted;

  if (useColors) {
    const colorCode = COLORS[level] || COLORS.reset;
    const tsStr = timestamp ? `${COLORS.timestamp}${timestamp}${COLORS.reset} ` : '';
    const levelStr = `${colorCode}${levelUpper}${COLORS.reset}`;
    const scriptStr = script ? `${COLORS.dim}${script}${COLORS.reset} ` : '';
    console.error(`${tsStr}${levelStr} ${scriptStr}${message}`);
  } else {
    const tsStr = timestamp ? `${timestamp} ` : '';
    const scriptStr = script ? `${script} ` : '';
    console.error(`${tsStr}${levelUpper} ${scriptStr}${message}`);
  }
}

/**
 * Write to file (no colors) with rotation check
 */
function writeFile(level, formatted) {
  if (!fileStream) return;

  const { timestamp, levelUpper, script, message } = formatted;
  const tsStr = timestamp ? `${timestamp} ` : '';
  const scriptStr = script ? `${script} ` : '';
  const line = `${tsStr}${levelUpper} ${scriptStr}${message}\n`;

  const bytes = Buffer.byteLength(line);
  fileStream.write(line);
  checkRotation(bytes);
}

/**
 * Create a logger instance for a specific script
 */
function createLogger(scriptName) {
  const log = (level, ...args) => {
    // Check if this level should be logged
    if (LEVELS[level] < LEVELS[config.level]) {
      return;
    }

    const formatted = formatMessage(level, scriptName, args);
    writeConsole(level, formatted);
    writeFile(level, formatted);
  };

  return {
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),

    // Log with timing
    time: (label) => {
      const start = Date.now();
      return {
        end: (message) => {
          const duration = Date.now() - start;
          log('info', `${label}: ${message || 'completed'} (${duration}ms)`);
          return duration;
        },
        check: (message) => {
          const duration = Date.now() - start;
          log('debug', `${label}: ${message} (${duration}ms elapsed)`);
        }
      };
    },

    // Structured logging for operations
    operation: (name, details = {}) => {
      log('info', `START ${name}`, details);
      const start = Date.now();
      return {
        success: (result = {}) => {
          const duration = Date.now() - start;
          log('info', `DONE ${name} (${duration}ms)`, result);
        },
        fail: (error, details = {}) => {
          const duration = Date.now() - start;
          log('error', `FAIL ${name} (${duration}ms)`, { error: error.message || error, ...details });
        }
      };
    },

    // Progress indicator for batch operations
    progress: (total, label = 'items') => {
      let current = 0;
      const start = Date.now();
      return {
        tick: (item) => {
          current++;
          if (current % 10 === 0 || current === total) {
            const pct = Math.round((current / total) * 100);
            const elapsed = Date.now() - start;
            log('debug', `${label}: ${current}/${total} (${pct}%) - ${elapsed}ms`);
          }
        },
        done: () => {
          const duration = Date.now() - start;
          log('info', `${label}: completed ${total} in ${duration}ms`);
        }
      };
    },

    // Set log level dynamically
    setLevel: (level) => {
      if (LEVELS[level] !== undefined) {
        config.level = level;
      }
    },

    // Get current config
    getConfig: () => ({ ...config })
  };
}

// Default logger (no script name)
const defaultLogger = createLogger(null);

// Export both the factory and default logger
module.exports = {
  ...defaultLogger,
  create: createLogger,
  LEVELS,
  config
};
