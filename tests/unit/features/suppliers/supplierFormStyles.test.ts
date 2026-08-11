import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const styles = readFileSync(
  resolve(process.cwd(), 'src/features/suppliers/styles/supplierForm.module.css'),
  'utf8',
)

const getRule = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('SupplierForm styles', () => {
  it('usa el espaciado canónico entre grupos, labels, controles y errores', () => {
    expect(getRule('.formContent')).toMatch(/gap:\s*1\.5rem/)
    expect(getRule('.formGroup')).not.toMatch(/margin-bottom/)
    expect(getRule('.formGroup label')).toMatch(/margin-bottom:\s*0\.5rem/)
    expect(getRule('.formGroup label')).not.toMatch(/margin-top|padding-top/)
    expect(getRule('.error')).toMatch(/margin-top:\s*0\.25rem/)
  })

  it('usa una barra negra en tema claro y blanca en tema oscuro', () => {
    expect(styles).toMatch(
      /:global\(\[data-theme="light"\]\)\s+\.formGroup label::before\s*{[^}]*background:\s*#000/s,
    )
    expect(styles).toMatch(
      /:global\(\[data-theme="dark"\]\)\s+\.formGroup label::before\s*{[^}]*background:\s*#fff/s,
    )
  })
})
