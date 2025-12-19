import { NextResponse } from 'next/server'

/**
 * Security-focused error response handler
 *
 * IMPORTANT: Never expose internal error details to clients.
 * Internal errors can reveal:
 * - Database schema names
 * - Table and column names
 * - RPC function names
 * - Stack traces with file paths
 * - Third-party service details
 */

/**
 * Returns a safe 500 error response without exposing internal details
 * Logs the full error internally for debugging
 */
export function safeErrorResponse(error: unknown, context?: string) {
  // Log detailed error internally
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  console.error(`[API Error${context ? ` - ${context}` : ''}]:`, {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  })

  // Return generic message to client
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

/**
 * Returns a safe 400 bad request response
 * Use for validation errors - message should be user-friendly, not technical
 */
export function safeBadRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  )
}

/**
 * Returns a 401 unauthorized response
 */
export function safeUnauthorized(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Returns a 403 forbidden response
 */
export function safeForbidden(message = 'Forbidden') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}

/**
 * Returns a 404 not found response
 */
export function safeNotFound(message = 'Not found') {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  )
}

/**
 * Returns a 429 too many requests response
 */
export function safeTooManyRequests(retryAfter?: number) {
  const headers: HeadersInit = {}
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter)
  }

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers }
  )
}

/**
 * Handles RPC errors safely
 * RPC errors often contain sensitive schema/function information
 */
export function safeRpcError(error: unknown, context?: string) {
  // Log full RPC error for debugging
  console.error(`[RPC Error${context ? ` - ${context}` : ''}]:`, error)

  // Return generic message
  return NextResponse.json(
    { error: 'Error processing request' },
    { status: 500 }
  )
}

/**
 * Handles database errors safely
 */
export function safeDatabaseError(error: unknown, context?: string) {
  // Log full database error for debugging
  console.error(`[Database Error${context ? ` - ${context}` : ''}]:`, error)

  // Return generic message
  return NextResponse.json(
    { error: 'Database operation failed' },
    { status: 500 }
  )
}
