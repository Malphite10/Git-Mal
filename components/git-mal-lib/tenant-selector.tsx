'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MalButton } from './button'

export interface Tenant {
  tenantId: string
  name: string
  slug: string
}

interface MalTenantSelectorProps {
  tenants: Tenant[]
  selectedTenant: Tenant
  onSelect: (tenant: Tenant) => void
  className?: string
  placeholder?: string
}

export function MalTenantSelector({
  tenants,
  selectedTenant,
  onSelect,
  className,
  placeholder = 'Select tenant',
}: MalTenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{selectedTenant?.name || placeholder}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg py-1">
          <ul role="listbox" className="max-h-60 overflow-auto">
            {tenants.map((tenant) => (
              <li key={tenant.tenantId} role="option" aria-selected={selectedTenant?.tenantId === tenant.tenantId}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tenant)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
                    selectedTenant?.tenantId === tenant.tenantId && 'bg-primary text-primary-foreground'
                  )}
                >
                  {tenant.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}