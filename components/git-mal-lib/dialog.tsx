'use client'

import { Fragment, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MalButton } from './button'

export interface MalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function MalDialog({ open, onOpenChange, title, description, children, className, size = 'md' }: MalDialogProps) {
  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in',
          'pointer-events-none'
        )}
      >
        <div
          className={cn(
            'relative w-full bg-[var(--card)] rounded-[var(--radius)] shadow-xl pointer-events-auto border border-[var(--border)]',
            sizeClasses[size],
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-[var(--card-foreground)]">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </Fragment>
  )
}

export interface MalAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
}

export function MalAlertDialog({ 
  open, onOpenChange, title, description, 
  confirmText = 'Confirm', cancelText = 'Cancel', 
  onConfirm, variant = 'default' 
}: MalAlertDialogProps) {
  if (!open) return null

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in">
        <div className="relative w-full max-w-md bg-[var(--card)] rounded-[var(--radius)] shadow-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">{title}</h2>
          {description && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <MalButton variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</MalButton>
            <MalButton 
              variant={variant === 'destructive' ? 'danger' : 'primary'} 
              onClick={() => { onConfirm(); onOpenChange(false); }}
            >
              {confirmText}
            </MalButton>
          </div>
        </div>
      </div>
    </Fragment>
  )
}