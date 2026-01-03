import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <textarea
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

Textarea.displayName = 'Textarea';

export default Textarea;
