/**
 * Prevent optional remote data from holding an entire server-rendered page open.
 * The original operation may still finish in the background, but callers regain
 * control within the configured deadline and can return a safe fallback.
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message = "Operation timed out"
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
