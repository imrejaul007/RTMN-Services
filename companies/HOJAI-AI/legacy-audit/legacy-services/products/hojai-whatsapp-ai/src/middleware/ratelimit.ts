export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    onError?: (err: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, backoff = 'exponential', onError } = options;

  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      onError?.(lastError, i + 1);

      if (i < attempts - 1) {
        const wait = backoff === 'exponential'
          ? delay * Math.pow(2, i)
          : delay * (i + 1);

        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  throw lastError!;
}

export async function withRetry<T>(
  promise: Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await retry(() => promise, {
      attempts: 3,
      delay: 1000,
      onError: (err) => console.error(`[Retry] ${context}:`, err.message)
    });
  } catch {
    console.error(`[Retry] ${context} failed after 3 attempts`);
    return null;
  }
}
