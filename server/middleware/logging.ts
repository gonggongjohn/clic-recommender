import { mkdirSync } from "node:fs";
import path from "node:path";
import morgan from "morgan";
import { createStream } from "rotating-file-stream";

let loggers: ReturnType<typeof morgan>[] | undefined;
let activeLogDirectory: string | undefined;

function createLoggers(baseDirectory: string) {
  const logDirectory = path.join(baseDirectory, "log");
  mkdirSync(logDirectory, { recursive: true });

  const accessLogStream = createStream("access.log", {
    interval: "14d",
    path: logDirectory,
  });
  const searchLogStream = createStream("search.log", {
    interval: "14d",
    path: logDirectory,
  });
  const visitLogStream = createStream("visit.log", {
    interval: "14d",
    path: logDirectory,
  });
  const errorLogStream = createStream("error.log", {
    size: "10M",
    path: logDirectory,
  });

  activeLogDirectory = baseDirectory;
  loggers = [
    morgan(":remote-addr :remote-user [:date[clf]] :method :url HTTP/:http-version :status :clic-body", {
      stream: accessLogStream,
      skip: (_req, res) => res.statusCode > 400,
    }),
    morgan(":remote-addr :remote-user [:date[clf]] :method :url HTTP/:http-version :status :clic-body", {
      stream: searchLogStream,
      skip: (req, res) => res.statusCode > 400 || !req.url?.includes("search"),
    }),
    morgan(":remote-addr :remote-user [:date[clf]] :method :url HTTP/:http-version :status :clic-body", {
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
  const config = useRuntimeConfig(event);
  const configuredLogDirectory =
    process.env.NUXT_LOG_DIR ?? process.env.LOG_DIR ?? config.logDir;
  const baseDirectory = configuredLogDirectory || process.cwd();

  if (!loggers || activeLogDirectory !== baseDirectory) {
    createLoggers(baseDirectory);
  }

  if (event.method === "POST") {
    const body = await readBody(event);
    (event.node.req as typeof event.node.req & { clicBody?: string }).clicBody = JSON.stringify(body);
  }

  for (const logger of loggers ?? []) {
    logger(event.node.req, event.node.res, () => {});
  }
});
