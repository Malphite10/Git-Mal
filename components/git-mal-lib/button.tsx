"use client"

import { Button as ShadcnButton, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type MalButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
export type MalButtonSize = 'sm' | 'default' | 'lg' | 'icon'

export interface MalButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  variant?: MalButtonVariant
  size?: MalButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const MalButton = ({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: MalButtonProps) => {
  const variantMap: Record<MalButtonVariant, ButtonProps['variant']> = {
    primary: 'default',
    secondary: 'secondary',
    danger: 'destructive',
    ghost: 'ghost',
    outline: 'outline',
  }

  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={size}
      className={cn(
        fullWidth && 'w-full',
        isLoading && 'opacity-75 cursor-not-allowed',
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
    </ShadcnButton>
  )
}

MalButton.displayName = 'MalButton'

export { MalButton as Button }