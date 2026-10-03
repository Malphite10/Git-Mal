'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface MalSelectOption {
  value: string
  label: string
}

export interface MalSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  options: MalSelectOption[]
  id?: string
}

export const MalSelect = forwardRef<HTMLSelectElement, MalSelectProps>(
  ({ className, label, error, helperText, placeholder, options, id, name, ...props }, ref) => {
    const selectId = id || name
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[var(--foreground)] mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 rounded-[var(--radius)] shadow-sm transition-colors appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent',
            'disabled:bg-[var(--muted)] disabled:cursor-not-allowed',
            error 
              ? 'border-[var(--destructive)] text-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]' 
              : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-[var(--destructive)]" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-[var(--muted-foreground)]">{helperText}</p>
        )}
      </div>
    )
  }
)

MalSelect.displayName = 'MalSelect'