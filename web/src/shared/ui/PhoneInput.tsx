import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * PhoneInput component with automatic formatting
 * Supports multiple input formats:
 * - +7 (XXX) XXX-XX-XX (Russia)
 * - +1 (XXX) XXX-XXXX (USA/Canada)
 * - 8XXXXXXXXXX -> converts to +7
 * - 7XXXXXXXXXX -> converts to +7
 * - International formats with country code
 */
export default function PhoneInput({
  value,
  onChange,
  placeholder = '+7 (999) 123-45-67',
  disabled = false,
  className = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
}: PhoneInputProps) {
  
  const getDigitsOnly = (str: string): string => {
    // Keep + and digits only
    return str.replace(/[^\d+]/g, '');
  };
  
  const formatPhoneNumber = (input: string): string => {
    if (!input) return '';
    
    // If just "+", keep it
    if (input === '+') return '+';
    
    // If starts with +, handle international format
    if (input.startsWith('+')) {
      const digits = input.slice(1);
      
      // +7 -> Russian
      if (digits.startsWith('7')) {
        return formatRussianNumber(digits.slice(1));
      }
      
      // +1 -> US/Canada
      if (digits.startsWith('1')) {
        return formatUSNumber(digits.slice(1));
      }
      
      // Other international numbers - just add spaces every 3-4 digits
      return formatInternationalNumber(digits);
    }
    
    // No + sign
    const digits = input;
    
    // 8XXXXXXXXXX -> Russian (convert 8 to 7)
    if (digits.startsWith('8') && digits.length > 1) {
      return formatRussianNumber(digits.slice(1));
    }
    
    // 7XXXXXXXXXX -> Russian
    if (digits.startsWith('7') && digits.length >= 10) {
      return formatRussianNumber(digits.slice(1));
    }
    
    // 1XXXXXXXXXX -> US/Canada
    if (digits.startsWith('1') && digits.length >= 10) {
      return formatUSNumber(digits.slice(1));
    }
    
    // Default: Russian format (local number without country code)
    return formatRussianNumber(digits);
  };
  
  const formatInternationalNumber = (digits: string): string => {
    // Format: +XX XXX XXX XXXX (generic international)
    if (!digits) return '+';
    
    // Extract country code (1-3 digits) and rest
    let countryCode = '';
    let rest = digits;
    
    // Try to detect country code length
    if (digits.length >= 1) {
      // Most common: 1-2 digit codes
      countryCode = digits.slice(0, Math.min(2, digits.length));
      rest = digits.slice(countryCode.length);
    }
    
    let result = `+${countryCode}`;
    
    if (rest.length > 0) {
      result += ' ';
      // Group remaining digits: XXX XXX XXXX
      if (rest.length <= 3) {
        result += rest;
      } else if (rest.length <= 6) {
        result += rest.slice(0, 3) + ' ' + rest.slice(3);
      } else if (rest.length <= 10) {
        result += rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6);
      } else {
        result += rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6, 10);
      }
    }
    
    return result;
  };
  
  const formatRussianNumber = (digits: string): string => {
    // Format: +7 (XXX) XXX-XX-XX
    const d = digits.slice(0, 10); // Max 10 digits after +7
    
    if (d.length === 0) return '+7';
    if (d.length <= 3) return `+7 (${d}`;
    if (d.length <= 6) return `+7 (${d.slice(0, 3)}) ${d.slice(3)}`;
    if (d.length <= 8) return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
  };
  
  const formatUSNumber = (digits: string): string => {
    // Format: +1 (XXX) XXX-XXXX
    const d = digits.slice(0, 10); // Max 10 digits after +1
    
    if (d.length === 0) return '+1';
    if (d.length <= 3) return `+1 (${d}`;
    if (d.length <= 6) return `+1 (${d.slice(0, 3)}) ${d.slice(3)}`;
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Extract + and digits only
    const cleaned = getDigitsOnly(input);
    
    // If empty, clear the field
    if (!cleaned) {
      onChange('');
      return;
    }
    
    // Format and update
    const formatted = formatPhoneNumber(cleaned);
    onChange(formatted);
  };
  
  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
