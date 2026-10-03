"use client"

import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface MalCardProps {
  title?: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

export const MalCard = ({
  title,
  description,
  footer,
  children,
  className,
  headerAction,
}: MalCardProps) => {
  return (
    <ShadcnCard className={cn('overflow-hidden', className)}>
      {(title || description || headerAction) && (
        <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', headerAction ? 'flex-row' : '')}>
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction && <div className="ml-4 flex-shrink-0">{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter className="border-t pt-4">{footer}</CardFooter>}
    </ShadcnCard>
  )
}

MalCard.displayName = 'MalCard'

export { MalCard as Card }