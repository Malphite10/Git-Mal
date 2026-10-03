'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface MalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const MalInput = forwardRef<HTMLInputElement, MalInputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-[var(--radius)] shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent',
            'disabled:bg-[var(--muted)] disabled:cursor-not-allowed',
            error 
              ? 'border-[var(--destructive)] text-[var(--destructive)] placeholder-[var(--muted-foreground)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]' 
              : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-[var(--destructive)]" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
        )}
      </div>
    )
  }
)

MalInput.displayName = 'MalInput'