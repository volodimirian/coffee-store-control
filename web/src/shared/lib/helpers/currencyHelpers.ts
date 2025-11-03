/**
 * Currency formatting utilities
 */

/**
 * Format a number as currency with proper thousands separators
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 0 for whole numbers, 2 for decimal numbers)
 * @param currency - Currency symbol (default: '₽')
 * @returns Formatted currency string (e.g., "32 000 ₽")
 * 
 * @example
 * formatCurrency(3000) // "3 000 ₽"
 * formatCurrency(32000) // "32 000 ₽"
 * formatCurrency(1500000) // "1 500 000 ₽"
 * formatCurrency(3000.50) // "3 000,50 ₽"
 * formatCurrency(3000.50, 2) // "3 000,50 ₽"
 * formatCurrency(3000, 0) // "3 000 ₽"
 */
export function formatCurrency(
  value: number | string,
  decimals?: number,
  currency: string = '₽'
): string {
  // Convert string to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Check if value is valid
  if (isNaN(numValue)) {
    return `0 ${currency}`;
  }

  // Determine decimal places
  const decimalPlaces = decimals !== undefined 
    ? decimals 
    : (numValue % 1 === 0 ? 0 : 2);

  // Format the number with fixed decimal places
  const fixedValue = numValue.toFixed(decimalPlaces);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = fixedValue.split('.');
  
  // Add thousands separators (space) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Combine with decimal part if exists
  const formattedNumber = decimalPart 
    ? `${formattedInteger},${decimalPart}` 
    : formattedInteger;
  
  // Return with currency symbol at the end
  return `${formattedNumber} ${currency}`;
}

/**
 * Format currency with automatic decimal handling
 * Shows 2 decimals only if the value has decimal places
 * @param value - The numeric value to format
 * @param currency - Currency symbol (default: '₽')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrencyAuto(3000) // "3 000 ₽"
 * formatCurrencyAuto(3000.50) // "3 000,50 ₽"
 * formatCurrencyAuto(3000.00) // "3 000 ₽"
 */
export function formatCurrencyAuto(
  value: number | string,
  currency: string = '₽'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const decimals = numValue % 1 === 0 ? 0 : 2;
  return formatCurrency(numValue, decimals, currency);
}

/**
 * Format currency for compact display (no decimals)
 * @param value - The numeric value to format
 * @param currency - Currency symbol (default: '₽')
 * @returns Formatted currency string without decimals
 * 
 * @example
 * formatCurrencyCompact(3000.99) // "3 001 ₽"
 * formatCurrencyCompact(32000) // "32 000 ₽"
 */
export function formatCurrencyCompact(
  value: number | string,
  currency: string = '₽'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return formatCurrency(Math.round(numValue), 0, currency);
}

/**
 * Format a number by removing trailing zeros after decimal point
 * Useful for displaying conversion factors and quantities
 * @param value - The numeric value to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1000) // "1000"
 * formatNumber(1.5000) // "1.5"
 * formatNumber(1.2340) // "1.234"
 * formatNumber("2.50") // "2.5"
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // If the number is an integer, show without decimal part
  if (num % 1 === 0) {
    return num.toString();
  }
  
  // For decimal numbers, remove trailing zeros
  return num.toFixed(4).replace(/\.?0+$/, '');
}
