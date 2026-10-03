"use client"

import { cn } from '@/lib/utils'

export interface MalFormFieldProps {
  label?: string
  description?: string
  error?: string
  children: React.ReactNode
  className?: string
}

export const MalFormField = ({ label, description, error, children, className }: MalFormFieldProps) => {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

MalFormField.displayName = 'MalFormField'

export { MalFormField as FormField }