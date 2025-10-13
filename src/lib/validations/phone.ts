/**
 * Phone Validation and Formatting Utilities
 *
 * Phone Format: (11) 98765-4321 or (11) 3456-7890
 */

/**
 * Remove all non-numeric characters from phone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Format phone with mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone)

  // Mobile: (XX) 9XXXX-XXXX (11 digits)
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  // Landline: (XX) XXXX-XXXX (10 digits)
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }

  // Return original if not 10 or 11 digits
  return phone
}

/**
 * Validate phone format (basic validation)
 */
export function isValidPhoneFormat(phone: string): boolean {
  const cleaned = cleanPhone(phone)

  // Must be 10 (landline) or 11 (mobile) digits
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return false
  }

  // Check if all digits are numeric
  if (!/^\d+$/.test(cleaned)) {
    return false
  }

  return true
}

/**
 * Validate phone number (full validation)
 */
export function validatePhone(phone: string): boolean {
  const cleaned = cleanPhone(phone)

  // Basic format validation
  if (!isValidPhoneFormat(cleaned)) {
    return false
  }

  // Extract DDD (area code)
  const ddd = parseInt(cleaned.substring(0, 2))

  // Valid Brazilian DDDs: 11-99
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
    21, 22, 24, // RJ
    27, 28, // ES
    31, 32, 33, 34, 35, 37, 38, // MG
    41, 42, 43, 44, 45, 46, // PR
    47, 48, 49, // SC
    51, 53, 54, 55, // RS
    61, // DF
    62, 64, // GO
    63, // TO
    65, 66, // MT
    67, // MS
    68, // AC
    69, // RO
    71, 73, 74, 75, 77, // BA
    79, // SE
    81, 87, // PE
    82, // AL
    83, // PB
    84, // RN
    85, 88, // CE
    86, 89, // PI
    91, 93, 94, // PA
    92, 97, // AM
    95, // RR
    96, // AP
    98, 99, // MA
  ]

  if (!validDDDs.includes(ddd)) {
    return false
  }

  // For mobile (11 digits), first digit after DDD must be 9
  if (cleaned.length === 11) {
    const firstDigit = parseInt(cleaned[2])
    if (firstDigit !== 9) {
      return false
    }
  }

  return true
}

/**
 * Get phone validation error message
 */
export function getPhoneError(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return 'Telefone é obrigatório'
  }

  const cleaned = cleanPhone(phone)

  if (cleaned.length < 10) {
    return 'Telefone deve ter no mínimo 10 dígitos'
  }

  if (cleaned.length > 11) {
    return 'Telefone deve ter no máximo 11 dígitos'
  }

  if (!validatePhone(phone)) {
    return 'Telefone inválido'
  }

  return null
}

/**
 * Mask phone input as user types
 */
export function maskPhoneInput(value: string): string {
  const cleaned = cleanPhone(value)

  if (cleaned.length <= 2) {
    return cleaned
  }
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  }
  if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  // Mobile format with 5 digits before dash
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

/**
 * Check if phone is mobile (11 digits starting with 9)
 */
export function isMobilePhone(phone: string): boolean {
  const cleaned = cleanPhone(phone)
  return cleaned.length === 11 && cleaned[2] === '9'
}

/**
 * Check if phone is landline (10 digits)
 */
export function isLandlinePhone(phone: string): boolean {
  const cleaned = cleanPhone(phone)
  return cleaned.length === 10
}
