import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  children: ReactNode
  wide?: boolean
}

export function Field({ label, children, wide = false }: FieldProps) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}
