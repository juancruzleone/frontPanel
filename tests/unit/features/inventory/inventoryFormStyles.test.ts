import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const styles = readFileSync(
  resolve(process.cwd(), 'src/features/inventory/styles/inventoryForm.module.css'),
  'utf8',
)

describe('InventoryForm styles', () => {
  it('usa una barra de label negra en tema claro y blanca en tema oscuro', () => {
    expect(styles).toMatch(
      /:global\(\[data-theme="light"\]\)\s+\.formGroup label::before\s*{[^}]*background:\s*#000/s,
    )
    expect(styles).toMatch(
      /:global\(\[data-theme="dark"\]\)\s+\.formGroup label::before\s*{[^}]*background:\s*#fff/s,
    )
    expect(styles).not.toMatch(
      /\.formGroup label::before\s*{[^}]*linear-gradient\(135deg,\s*var\(--color-primary\)/s,
    )
  })
})
