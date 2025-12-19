/**
 * In-memory rate limiter for API protection
 *
 * This implementation uses a sliding window approach with in-memory storage.
 * For production with multiple server instances, consider using Redis or
 * Upstash Rate Limit.
 *
 * WARNING: This implementation resets on server restart and doesn't share
 * state between multiple server instances. For distributed environments,
 * use a Redis-based solution.
 */

interface RateLimitRecord {
  count: number
  windowStart: number
}

// In-memory storage for rate limit records
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old records periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
let lastCleanup = Date.now()

function cleanupOldRecords(windowMs: number) {
  const now = Date.now()

  // Only cleanup if enough time has passed
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now

  // Remove records that are older than the window
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > windowMs * 2) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of remaining requests in the window */
  remaining: number
  /** Time until the window resets (in seconds) */
  resetIn: number
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs } = config
  const now = Date.now()

  // Cleanup old records periodically
  cleanupOldRecords(windowMs)

  // Get or create record for this identifier
  let record = rateLimitStore.get(identifier)

  // If no record or window expired, create new record
  if (!record || now - record.windowStart >= windowMs) {
    record = {
      count: 1,
      windowStart: now,
    }
    rateLimitStore.set(identifier, record)

    return {
      success: true,
      remaining: limit - 1,
      resetIn: Math.ceil(windowMs / 1000),
    }
  }

  // Window is still active
  const remaining = limit - record.count - 1
  const resetIn = Math.ceil((record.windowStart + windowMs - now) / 1000)

  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn,
    }
  }

  // Increment counter
  record.count++

  return {
    success: true,
    remaining: Math.max(0, remaining),
    resetIn,
  }
}

/**
 * Pre-configured rate limiters for different use cases
 *
 * NOTE: Limits are set high enough to accommodate dashboards with
 * multiple parallel requests (e.g., DRE loads data for multiple branches)
 */
export const rateLimiters = {
  /**
   * Standard API rate limit: 300 requests per minute
   * Allows ~5 requests per second for normal usage
   */
  standard: (identifier: string) =>
    checkRateLimit(identifier, { limit: 300, windowMs: 60 * 1000 }),

  /**
   * Strict rate limit for sensitive operations: 30 requests per minute
   * Use for: user management, configuration changes
   */
  strict: (identifier: string) =>
    checkRateLimit(identifier, { limit: 30, windowMs: 60 * 1000 }),

  /**
   * Auth rate limit: 10 requests per minute
   * Use for: login attempts, password recovery, user creation
   * Still strict to prevent brute force attacks
   */
  auth: (identifier: string) =>
    checkRateLimit(identifier, { limit: 10, windowMs: 60 * 1000 }),

  /**
   * Report/dashboard rate limit: 150 requests per minute
   * Higher limit to accommodate dashboards that load multiple data sources
   * (e.g., DRE loads data for each branch in parallel)
   */
  reports: (identifier: string) =>
    checkRateLimit(identifier, { limit: 150, windowMs: 60 * 1000 }),
}

/**
 * Get client IP address from request headers
 * Works with common proxy setups (Vercel, Cloudflare, etc.)
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Get the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim()
  }

  // Vercel
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  // Fallback
  return 'unknown'
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetIn),
  }
}
