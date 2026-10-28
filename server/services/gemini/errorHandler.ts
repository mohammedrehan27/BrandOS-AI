export class GeminiQuotaExceededError extends Error {
  public readonly code = 'GEMINI_QUOTA_EXCEEDED'
  public readonly statusCode = 429

  constructor(message = 'Gemini API quota or rate limit exceeded. Please wait or check your Google AI Studio plan.') {
    super(message)
    this.name = 'GeminiQuotaExceededError'
  }
}

export class GeminiTimeoutError extends Error {
  public readonly code = 'GEMINI_TIMEOUT'
  public readonly statusCode = 504

  constructor(timeoutMs: number) {
    super(`Gemini API inference timed out after ${timeoutMs}ms.`)
    this.name = 'GeminiTimeoutError'
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new GeminiTimeoutError(timeoutMs))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timer!)
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED')

    if (isRateLimit) {
      throw new GeminiQuotaExceededError(error.message)
    }

    if (retries <= 0) throw error

    await new Promise((r) => setTimeout(r, delayMs))
    return withRetry(fn, retries - 1, delayMs * 2)
  }
}
