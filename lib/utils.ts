import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fixed colors for specific pitch types
export const pitchTypeColors = {
  "Four-Seam": "#ff6b35",
  "Curveball": "#8b5cf6", 
  "Slider": "#06b6d4",
  "Changeup": "#96ceb4",
  "Cutter": "#feca57",
  "Sinker": "#ff9ff3",
  "Splitter": "#54a0ff"
}

/**
 * Precise cookie extraction that avoids conflicts with similar cookie names
 * @param cookieString - The raw cookie string from request headers
 * @param cookieName - The exact name of the cookie to extract
 * @returns The cookie value or null if not found
 */
export function extractCookie(cookieString: string, cookieName: string): string | null {
  if (!cookieString || !cookieName) {
    return null;
  }

  // Split cookies by semicolon and trim whitespace
  const cookies = cookieString.split(';').map(cookie => cookie.trim());
  
  // Find the exact cookie that starts with the specific name
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      // Extract the value after the equals sign
      const value = cookie.substring(cookieName.length + 1);
      
      // URL decode the value to handle special characters
      try {
        return decodeURIComponent(value);
      } catch (error) {
        // If URL decoding fails, return the raw value
        console.warn(`Failed to URL decode cookie value for ${cookieName}:`, error);
        return value;
      }
    }
  }
  
  return null;
}

/**
 * URL encode a value for safe cookie storage
 * @param value - The value to encode
 * @returns The URL encoded value
 */
export function encodeCookieValue(value: string): string {
  try {
    return encodeURIComponent(value);
  } catch (error) {
    console.warn('Failed to URL encode cookie value:', error);
    return value;
  }
}

/**
 * Standardize date parsing to avoid timezone issues
 * This ensures both your team and opponent team players get dates processed the same way
 * @param dateString - The date string from the database
 * @returns A standardized date string in YYYY-MM-DD format
 */
export function standardizeGameDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Parse the date and convert to local timezone consistently
    const date = new Date(dateString);
    
    // Format as YYYY-MM-DD to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Failed to standardize date:', dateString, error);
    return dateString;
  }
}

/**
 * Parse a standardized date string for display
 * @param dateString - The standardized date string
 * @returns A Date object for display purposes
 */
export function parseGameDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  try {
    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date(dateString + 'T00:00:00');
    }
    
    // Otherwise, parse normally
    return new Date(dateString);
  } catch (error) {
    console.warn('Failed to parse game date:', dateString, error);
    return new Date();
  }
}

/**
 * Convert IP decimal values to baseball notation for display only
 * This does NOT affect calculations - only changes appearance
 * @param ip - The innings pitched value (e.g., 5.3, 6.7, 2.1)
 * @returns The baseball notation version (e.g., 5.1, 6.2, 2.1)
 */
export function displayInningsPitched(ip: number): string {
  if (typeof ip !== 'number' || isNaN(ip)) {
    return '0.0';
  }
  
  const wholeInnings = Math.floor(ip);
  const decimalPart = ip - wholeInnings;
  
  // Handle floating-point precision issues by rounding to 1 decimal place
  const roundedDecimal = Math.round(decimalPart * 10) / 10;
  
  // Convert decimal to baseball notation
  let baseballDecimal: number;
  if (Math.abs(roundedDecimal - 0.3) < 0.01) {
    baseballDecimal = 0.1; // 1 out = .1
  } else if (Math.abs(roundedDecimal - 0.7) < 0.01) {
    baseballDecimal = 0.2; // 2 outs = .2
  } else {
    // Keep other decimals as-is (like .1, .2, .0)
    baseballDecimal = roundedDecimal;
  }
  
  const result = `${wholeInnings}.${Math.round(baseballDecimal * 10)}`;
  return result;
}

/**
 * Convert baseball notation back to decimal for calculations
 * @param baseballIP - The baseball notation IP (e.g., 5.1, 6.2)
 * @returns The decimal version for calculations (e.g., 5.3, 6.7)
 */
export function baseballToDecimalIP(baseballIP: string): number {
  const parts = baseballIP.split('.');
  if (parts.length !== 2) {
    return parseFloat(baseballIP) || 0;
  }
  
  const wholeInnings = parseInt(parts[0]) || 0;
  const baseballDecimal = parseInt(parts[1]) || 0;
  
  // Convert baseball notation back to decimal
  let decimalPart: number;
  if (baseballDecimal === 1) {
    decimalPart = 0.3; // .1 = 1 out = .3
  } else if (baseballDecimal === 2) {
    decimalPart = 0.7; // .2 = 2 outs = .7
  } else {
    decimalPart = baseballDecimal * 0.1; // .0, .3, .4, etc.
  }
  
  return wholeInnings + decimalPart;
}
