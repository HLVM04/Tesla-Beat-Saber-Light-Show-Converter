export type LogType = "info" | "success" | "warning" | "error";

export function logConsole(msg: string, type: LogType = "info") {
  const prefix = `[TeslaConverter] [${type.toUpperCase()}]`;
  if (type === "error") {
    console.error(`${prefix} ${msg}`);
  } else if (type === "warning") {
    console.warn(`${prefix} ${msg}`);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}
