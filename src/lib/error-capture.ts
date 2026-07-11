let lastError: unknown;

export function consumeLastCapturedError(): unknown {
  const e = lastError;
  lastError = undefined;
  return e;
}

if (typeof process !== "undefined" && typeof (process as any).on === "function") {
  try {
    (process as any).on("uncaughtException", (err: unknown) => { lastError = err; });
    (process as any).on("unhandledRejection", (err: unknown) => { lastError = err; });
  } catch {}
}
