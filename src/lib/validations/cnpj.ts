/**
 * CNPJ Validation and Formatting Utilities
 *
 * CNPJ Format: 00.000.000/0000-00
 */

/**
 * Remove all non-numeric characters from CNPJ
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

/**
 * Format CNPJ with mask: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj)

  if (cleaned.length !== 14) {
    return cnpj // Return original if not 14 digits
  }

  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

/**
 * Validate CNPJ format (basic format validation)
 */
export function isValidCNPJFormat(cnpj: string): boolean {
  const cleaned = cleanCNPJ(cnpj)
  return cleaned.length === 14 && /^\d{14}$/.test(cleaned)
}

/**
 * Calculate CNPJ check digit
 */
function calculateCNPJDigit(cnpj: string, position: number): number {
  let sum = 0
  let weight = position === 12 ? 5 : 6

  for (let i = 0; i < position; i++) {
    sum += parseInt(cnpj[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }

  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

/**
 * Validate CNPJ with check digits (full validation)
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanCNPJ(cnpj)

  // Check format
  if (!isValidCNPJFormat(cleaned)) {
    return false
  }

  // Check if all digits are the same (invalid CNPJs)
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false
  }

  // Validate check digits
  const digit1 = calculateCNPJDigit(cleaned, 12)
  const digit2 = calculateCNPJDigit(cleaned, 13)

  return (
    parseInt(cleaned[12]) === digit1 &&
    parseInt(cleaned[13]) === digit2
  )
}

/**
 * Get CNPJ validation error message
 */
export function getCNPJError(cnpj: string): string | null {
  if (!cnpj || cnpj.trim() === '') {
    return 'CNPJ é obrigatório'
  }

  const cleaned = cleanCNPJ(cnpj)

  if (cleaned.length !== 14) {
    return 'CNPJ deve conter 14 dígitos'
  }

  if (!validateCNPJ(cnpj)) {
    return 'CNPJ inválido'
  }

  return null
}

/**
 * Mask CNPJ input as user types
 */
export function maskCNPJInput(value: string): string {
  const cleaned = cleanCNPJ(value)

  if (cleaned.length <= 2) {
    return cleaned
  }
  if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`
  }
  if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`
  }
  if (cleaned.length <= 12) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`
  }

  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`
}
