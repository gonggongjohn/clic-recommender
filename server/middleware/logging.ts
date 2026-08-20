import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import morgan from "morgan";
import { createStream } from "rotating-file-stream";

/** Minimal shape morgan needs for its `stream` option. */
type LogStream = { write(chunk: string): void };

const LOG_FORMAT =
  ":remote-addr :remote-user [:date[clf]] :method :url HTTP/:http-version :status :clic-body";

let loggers: ReturnType<typeof morgan>[] | undefined;
let activeLogDirectory: string | undefined;

/**
 * Azure Static Web Apps runs managed functions from a read-only file system,
 * so `mkdir` throws (EROFS/EACCES/ENOENT) and every request 500s. Try the
 * configured directory first, then the OS temp directory, and report failure
 * by returning undefined so the caller can fall back to stdout.
 */
function resolveWritableDirectory(baseDirectory: string): string | undefined {
  const candidates = [
    path.join(baseDirectory, "log"),
    path.join(os.tmpdir(), "clic-recommender", "log"),
  ];

  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch (error) {
      console.warn(
        `[logging] log directory unavailable: ${candidate} (${(error as Error).message})`,
      );
    }
  }

  return undefined;
}

/**
 * On hosts without a writable disk, log to stdout instead. Azure forwards
 * function stdout to Application Insights, so the records are still captured.
 */
function stdoutStream(tag: string): LogStream {
  return {
    write: (chunk: string) => process.stdout.write(`[${tag}] ${chunk}`),
  };
}

function createLoggers(baseDirectory: string) {
  const logDirectory = resolveWritableDirectory(baseDirectory);

  if (!logDirectory) {
    console.warn("[logging] no writable log directory; falling back to stdout");
  }

  const openStream = (
    tag: string,
    filename: string,
    options: Parameters<typeof createStream>[1],
  ): LogStream => {
    if (!logDirectory) {
      return stdoutStream(tag);
    }

    try {
      return createStream(filename, { ...options, path: logDirectory });
    } catch (error) {
      console.warn(
        `[logging] could not open ${filename}: ${(error as Error).message}`,
      );
      return stdoutStream(tag);
    }
  };

  const accessLogStream = openStream("access", "access.log", { interval: "14d" });
  const searchLogStream = openStream("search", "search.log", { interval: "14d" });
  const visitLogStream = openStream("visit", "visit.log", { interval: "14d" });
  const errorLogStream = openStream("error", "error.log", { size: "10M" });

  activeLogDirectory = baseDirectory;
  loggers = [
    morgan(LOG_FORMAT, {
      stream: accessLogStream,
      skip: (_req, res) => res.statusCode > 400,
    }),
    morgan(LOG_FORMAT, {
      stream: searchLogStream,
      skip: (req, res) => res.statusCode > 400 || !req.url?.includes("search"),
    }),
    morgan(LOG_FORMAT, {
      stream: visitLogStream,
      skip: (req, res) => res.statusCode > 400 || !req.url?.includes("visit"),
    }),
    morgan("common", {
      stream: errorLogStream,
      skip: (_req, res) => res.statusCode <= 400,
    }),
  ];

  return loggers;
}

morgan.token("clic-body", (req) => (req as typeof req & { clicBody?: string }).clicBody ?? "");

export default defineEventHandler(async (event) => {
  // Logging must never be able to fail a request. Anything thrown in here
  // would otherwise surface as a 500 for every route on the site.
  try {
    const config = useRuntimeConfig(event);
    const configuredLogDirectory =
      process.env.NUXT_LOG_DIR ?? process.env.LOG_DIR ?? config.logDir;
    const baseDirectory = configuredLogDirectory || process.cwd();

    if (!loggers || activeLogDirectory !== baseDirectory) {
      createLoggers(baseDirectory);
    }

    if (event.method === "POST") {
      const body = await readBody(event);
      (event.node.req as typeof event.node.req & { clicBody?: string }).clicBody =
        JSON.stringify(body);
    }

    for (const logger of loggers ?? []) {
      logger(event.node.req, event.node.res, () => {});
    }
  } catch (error) {
    console.error("[logging] request logging failed:", error);
  }
});