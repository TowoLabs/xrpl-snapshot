import { createLogger, format, transports } from "winston";
import { LEVEL, MESSAGE } from "triple-beam";
import jsonStringify from "fast-safe-stringify";

const prepareMessage = format((info) => {
  if (info.message === undefined) {
    info.message = "undefined";
  } else if (info.message === null || typeof info.message !== "string") {
    info.message = jsonStringify(info.message, undefined, 2);
  }

  return info;
});

const consoleFormat = format((info) => {
  const timestamp = getCurrentTimestamp();
  const padding = " ".repeat(7 - info[LEVEL].length);

  const meta = info.serviceMeta ? ` (${info.serviceMeta})` : "";

  if (info.error?.stack) {
    info.message += "\n" + info.error.stack;
  } else if (info.error) {
    info.message += "\n" + jsonStringify(info.error, undefined, 2);
  }

  const prefix = `[${timestamp}] ${info.level}:${padding} `;
  const prefixLength = prefix.length - info.level.length + info[LEVEL].length;
  const fixedMessage = info.message
    .split("\n")
    .map((line) => " ".repeat(prefixLength) + line)
    .join("\n")
    .trim();

  info[MESSAGE] = `${prefix}${fixedMessage}${meta}`;

  return info;
});

/**
 * Simple helper created to avoid moment dependency
 * (from https://stackoverflow.com/a/13219636)
 */
function getCurrentTimestamp() {
  return new Date()
    .toISOString()
    .replace(/T/, " ") // replace T with a space
    .replace(/\..+/, ""); // delete the dot and everything after
}

function initLogger() {
  return createLogger({
    level: "debug",
    format: format.combine(
      format.colorize(),
      prepareMessage(),
      consoleFormat()
    ),
    transports: [new transports.Console()],
  });
}

export const logger = initLogger();
