/**
 * Structured logger for freshcrate.
 * Outputs JSON lines to stdout — pipe to any log aggregator.
 * No dependencies. Production-ready.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...data,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const log = {
  info: (msg: string, data?: Record<string, unknown>) => emit("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit("error", msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.DEBUG) emit("debug", msg, data);
  },

  /** Log an API request (called from middleware). */
  request: (data: {
    method: string;
    path: string;
    status: number;
    duration_ms: number;
    ip?: string;
    user_agent?: string;
    api_key_prefix?: string;
  }) => {
    emit("info", "request", data);
  },
};
