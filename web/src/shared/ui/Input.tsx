import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full rounded-lg border py-2 px-3 text-sm leading-5
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
