/**
 * Phone Number Validation and Normalization Utilities
 * 
 * This module provides server-side phone number validation using libphonenumber-js.
 * All phone numbers are normalized to E.164 format before storage.
 * 
 * E.164 format: +[country code][national number]
 * Example: +14155552671 (US), +442071838750 (UK), +919876543210 (India)
 * 
 * Maximum length: 15 digits (per ITU-T E.164 standard)
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

/**
 * Validates a phone number string
 * 
 * @param phoneNumber - Phone number string (can be in any format)
 * @param defaultCountry - Optional default country code (ISO 3166-1 alpha-2)
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(
  phoneNumber: string | null | undefined,
  defaultCountry?: CountryCode
): boolean {
  if (!phoneNumber) return false
  
  try {
    // Strip whitespace and basic validation
    const cleaned = phoneNumber.trim()
    if (!cleaned) return false
    
    // Use libphonenumber-js for validation
    // If the number doesn't start with +, we need a default country
    if (!cleaned.startsWith('+') && !defaultCountry) {
      return false
    }
    
    return isValidPhoneNumber(cleaned, defaultCountry)
  } catch (error) {
    return false
  }
}

/**
 * Normalizes a phone number to E.164 format
 * 
 * @param phoneNumber - Phone number string (can be in any format)
 * @param defaultCountry - Optional default country code (ISO 3166-1 alpha-2)
 * @returns E.164 formatted phone number or null if invalid
 */
export function normalizePhoneNumber(
  phoneNumber: string | null | undefined,
  defaultCountry?: CountryCode
): string | null {
  if (!phoneNumber) return null
  
  try {
    const cleaned = phoneNumber.trim()
    if (!cleaned) return null
    
    // If the number doesn't start with +, we need a default country
    if (!cleaned.startsWith('+') && !defaultCountry) {
      return null
    }
    
    // Parse and format to E.164
    const parsed = parsePhoneNumber(cleaned, defaultCountry)
    
    if (!parsed || !parsed.isValid()) {
      return null
    }
    
    // Return E.164 format
    return parsed.format('E.164')
  } catch (error) {
    console.error('Phone normalization error:', error)
    return null
  }
}

/**
 * Validates and normalizes a phone number in one operation
 * 
 * @param phoneNumber - Phone number string (can be in any format)
 * @param defaultCountry - Optional default country code (ISO 3166-1 alpha-2)
 * @returns Object with validation result and normalized number
 */
export function validateAndNormalizePhone(
  phoneNumber: string | null | undefined,
  defaultCountry?: CountryCode
): {
  isValid: boolean
  normalized: string | null
  error?: string
} {
  if (!phoneNumber) {
    return {
      isValid: false,
      normalized: null,
      error: 'Phone number is required'
    }
  }
  
  const cleaned = phoneNumber.trim()
  
  if (!cleaned) {
    return {
      isValid: false,
      normalized: null,
      error: 'Phone number cannot be empty'
    }
  }
  
  // Check if it starts with + (E.164 format)
  if (!cleaned.startsWith('+')) {
    return {
      isValid: false,
      normalized: null,
      error: 'Phone number must be in E.164 format (starting with +)'
    }
  }
  
  try {
    const parsed = parsePhoneNumber(cleaned, defaultCountry)
    
    if (!parsed || !parsed.isValid()) {
      return {
        isValid: false,
        normalized: null,
        error: 'Invalid phone number format'
      }
    }
    
    return {
      isValid: true,
      normalized: parsed.format('E.164')
    }
  } catch (error: any) {
    return {
      isValid: false,
      normalized: null,
      error: error.message || 'Phone number validation failed'
    }
  }
}

/**
 * Get phone number metadata (country, type, etc.)
 * 
 * @param phoneNumber - Phone number in E.164 format
 * @returns Metadata object or null if invalid
 */
export function getPhoneMetadata(phoneNumber: string) {
  try {
    const parsed = parsePhoneNumber(phoneNumber)
    
    if (!parsed || !parsed.isValid()) {
      return null
    }
    
    return {
      country: parsed.country,
      countryCallingCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
      type: parsed.getType(),
      isValid: parsed.isValid(),
      isPossible: parsed.isPossible(),
    }
  } catch (error) {
    return null
  }
}
