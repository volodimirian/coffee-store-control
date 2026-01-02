/**
 * Validates and formats decimal input with configurable decimal places limit
 * Used for price, quantity, and other numeric inputs
 * 
 * @param value - Input string value
 * @param maxDecimals - Maximum number of decimal places (default: 2)
 * @returns Validated value or null if invalid
 */
export function validateDecimalInput(value: string, maxDecimals: number = 2): string | null {
  // Allow empty string
  if (value === '') {
    return value;
  }
  
  // Check if it matches decimal pattern
  if (!/^\d*\.?\d*$/.test(value)) {
    return null;
  }
  
  // Prevent leading zeros (except for "0" or "0.X")
  if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
    return null;
  }
  
  // Check decimal places limit
  const parts = value.split('.');
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return null; // Don't allow more decimal places than limit
  }
  
  return value;
}

/**
 * Handler for decimal input onChange event
 * Validates input and calls onChange only if valid
 * 
 * @param e - React ChangeEvent
 * @param onChange - Callback function to call with validated value
 * @param maxDecimals - Maximum number of decimal places (default: 2)
 */
export function handleDecimalChange(
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
  maxDecimals: number = 2
): void {
  const value = e.target.value;
  const validated = validateDecimalInput(value, maxDecimals);
  
  if (validated !== null) {
    onChange(validated);
  }
}

/**
 * Limits decimal input in real-time using onInput event
 * More aggressive than onChange - prevents typing invalid characters
 * 
 * @param e - React FormEvent
 * @param maxDecimals - Maximum number of decimal places (default: 2)
 */
export function limitDecimalInput(
  e: React.FormEvent<HTMLInputElement>,
  maxDecimals: number = 2
): void {
  const target = e.target as HTMLInputElement;
  const value = target.value;
  
  if (value.includes('.')) {
    const parts = value.split('.');
    if (parts[1] && parts[1].length > maxDecimals) {
      target.value = parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
  }
}
