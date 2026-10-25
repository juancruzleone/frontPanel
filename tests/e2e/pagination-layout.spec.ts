import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Real-route coverage below is supplemented by production-CSS layout fixtures.
// Fixtures render the actual TourButton, including its main:has() cascade.
test.use({ serviceWorkers: 'block' })
const widths = [320, 390, 768, 1024, 1440]
const fixtureDocument = `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><div id="root"></div>
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script></body></html>`

async function mockSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'es')
    localStorage.setItem('installationsTourCompleted', 'true')
    localStorage.setItem('clientsTourCompleted', 'true')
  })
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const body = path.endsWith('/verify')
      ? { cuenta: { _id: 'layout-admin', userName: 'layout-admin', role: 'admin', tenantId: 'layout-tenant' } }
      : path.includes('/billing/')
        ? { success: true, data: { accessMode: 'full', trial: null, tenant: null } }
        : []
    return route.fulfill({ json: body })
  })
  await page.route('**/socket.io**', route => route.abort())
}

for (const width of widths) {
  test(`real Installations route ${width}px: no reported bottom padding`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await mockSession(page)
    await page.route('**/api/installations**', route => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get('page') || 1)
      return route.fulfill({ json: {
        success: true,
        data: [{ _id: `inst-${pageNumber}`, company: `Planta ${pageNumber}`, address: 'Calle de prueba', installationType: 'industrial', devices: [] }],
        pagination: { page: pageNumber, limit: 10, total: 11, totalPages: 2 },
      } })
    })
    await page.goto('/instalaciones')
    await expect(page.getByText('Planta 1', { exact: true }).first()).toBeVisible()
    const pagination = page.locator('main [class*="_pagination_"]')
    const tour = page.locator('main button[class*="_tourButton_"]')
    await expect(tour).toBeVisible()
    const geometry = await page.locator('main').evaluate(main => {
      const root = main.querySelector('[class*="_containerInstallations_"]')!
      const pagination = main.querySelector('[class*="_pagination_"]')!
      return {
        mainPadding: getComputedStyle(main).paddingBottom,
        rootPadding: getComputedStyle(root).paddingBottom,
        gap: main.getBoundingClientRect().bottom - pagination.getBoundingClientRect().bottom,
        height: main.getBoundingClientRect().height,
        headingTop: main.querySelector('h1')!.getBoundingClientRect().top,
      }
    })
    console.log(`Installations ${width}px geometry`, geometry)
    expect.soft(geometry.mainPadding).toBe('0px')
    expect.soft(geometry.rootPadding).toBe('0px')
    expect.soft(Math.abs(geometry.gap)).toBeLessThanOrEqual(1)
    expect.soft(geometry.headingTop).toBeGreaterThanOrEqual(70)
    expect.soft(geometry.height).toBeLessThanOrEqual(1001)
    await expect(pagination.locator('button').first()).toBeDisabled()
    await pagination.locator('button').last().click()
    await expect(page.getByText('Planta 2', { exact: true }).first()).toBeVisible()
    await expect(pagination.locator('button').last()).toBeDisabled()
    await pagination.locator('button').first().click()
    await expect(page.getByText('Planta 1', { exact: true }).first()).toBeVisible()
    await tour.focus()
    await expect(tour).toBeFocused()
    await tour.press('Enter')
    await expect(page.locator('.driver-popover')).toBeVisible()
  })
}

for (const width of [390, 1440]) {
  test(`nonpaginated Clients preserves tour clearance ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await mockSession(page)
    await page.goto('/clientes')
    await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
    const tour = page.locator('main button[class*="_tourButton_"]')
    await expect(tour).toBeVisible()
    expect(await page.locator('main').evaluate(main => getComputedStyle(main).paddingBottom)).toBe('88px')
    const box = await tour.boundingBox()
    expect(box).toMatchObject({ x: width - 72, y: 928, width: 56, height: 56 })
    // Temporary, uncommitted differential against the exact allowed-file starting snapshot.
    const snapshot = JSON.parse(readFileSync('node_modules/.vite/pagination-start.json', 'utf8')) as Record<string, string>
    const originalTourCss = snapshot['src/shared/components/Buttons/buttons.module.css'].split('/* Reserve scroll room')[1]
    const measureShared = () => page.locator('main').evaluate(main => ({
      main: main.getBoundingClientRect().toJSON(),
      content: main.firstElementChild!.getBoundingClientRect().toJSON(),
      tour: main.querySelector('button[class*="_tourButton_"]')!.getBoundingClientRect().toJSON(),
      padding: getComputedStyle(main).paddingBottom,
      after: getComputedStyle(main, '::after').height,
      scrollHeight: document.body.scrollHeight,
    }))
    const currentShared = await measureShared()
    const tourClass = await tour.getAttribute('class')
    const baselineStyle = await page.addStyleTag({ content: (`/* Reserve scroll room${originalTourCss}`)
      .replaceAll(':global(main)', 'main').replaceAll('.tourButton', `.${tourClass}`) })
    expect(await measureShared()).toEqual(currentShared)
    console.log(`Clients snapshot/current differential ${width}px: identical geometry`, currentShared)
    await baselineStyle.evaluate(style => style.remove())
    await tour.focus()
    await expect(tour).toBeFocused()
    await tour.press('Enter')
    await expect(page.locator('.driver-popover')).toBeVisible()
  })
}
const sections = [
  { name: 'Installations', feature: 'installations', file: 'installations', root: 'containerInstallations', list: 'listContainer', card: 'installationCard' },
  { name: 'Assets', feature: 'assets', file: 'assets', root: 'containerAssets', list: 'listContainer', card: 'assetCard' },
  { name: 'Forms', feature: 'forms', file: 'forms', root: 'containerForms', list: 'listContainer', card: 'templateCard', cards: 'templatesGrid' },
  { name: 'Manuals', feature: 'manuals', file: 'manuals', root: 'containerManuals', list: 'listContainer', card: 'manualCard' },
  { name: 'WorkOrders', feature: 'workOrders', file: 'workOrders', root: 'containerWorkOrders', list: 'listContainer', card: 'workOrderCard' },
  { name: 'Subscriptions', feature: 'subscriptions', file: 'subscriptions', root: 'containerSubscriptions', list: 'tableContainer', card: 'subscriptionCard', cards: 'cardsGrid' },
  { name: 'Inventory', feature: 'inventory', file: 'inventory', root: 'containerInventory', list: 'listContainer', card: 'inventoryCard', cards: 'cardsGrid', outside: true },
  { name: 'Tenants', feature: 'tenants', file: 'tenants', root: 'containerTenants', list: 'listContainer', card: 'tenantCard' },
  { name: 'InstallationsDetails', feature: 'installationsDetails', file: 'installationDetails', root: 'container', list: 'devicesList', card: 'deviceCard', outside: true },
]

for (const viewport of widths.map(width => ({ width, height: 1000 }))) {
  for (const section of sections) {
    for (const mode of ['cards', 'table']) {
      for (const length of ['short', 'long']) {
        // Full long-content coverage at mobile/desktop; intermediate widths pin the cascade.
        if (length === 'long' && ![390, 1440].includes(viewport.width)) continue
        test(`${section.name} ${mode} ${length} ${viewport.width}px`, async ({ page }) => {
          await page.setViewportSize(viewport)
          const safeArea = viewport.width === 390 && mode === 'cards' && length === 'short' ? 24 : 0
          // Serve only a fixture document; CSS modules still come from the real Vite server.
          await page.route('**/__pagination-layout', route => route.fulfill({
            contentType: 'text/html',
            body: fixtureDocument,
          }))
          await page.goto('/__pagination-layout')
          const count = length === 'short' ? 1 : 30
          await page.evaluate(async ({ section, mode, count, safeArea }) => {
            const loadCss = async (path: string): Promise<Record<string, string>> => (await import(path)).default
            await loadCss('/src/index.css')
            const layout = await loadCss('/src/layouts/MainLayout.module.css')
            const styles = await loadCss(`/src/features/${section.feature}/styles/${section.file}.module.css`)
            const tableStyles = await loadCss('/src/components/DataTable/DataTable.module.css')
            const card = (index: number) => `<article data-record class="${styles[section.card]}">
              <h3>Registro ${index + 1}</h3><p>Contenido de mantenimiento</p><button>Ver detalle</button>
            </article>`
            const records = Array.from({ length: count }, (_, index) => card(index)).join('')
            let content = section.cards ? `<div class="${styles[section.cards]}">${records}</div>` : records
            if (mode === 'table') {
              const custom = section.name === 'Subscriptions' || section.name === 'InstallationsDetails'
              const table = custom ? (styles.devicesTable || styles.table) : tableStyles.table
              const cell = custom ? (styles.tableCell || '') : tableStyles.td
              const row = custom ? (styles.tableRow || '') : tableStyles.tr
              const rows = Array.from({ length: count }, (_, index) =>
                `<tr data-record class="${row}"><td class="${cell}">Registro ${index + 1}</td><td class="${cell}">Mantenimiento</td></tr>`).join('')
              const markup = `<table class="${table}"><thead class="${custom ? '' : tableStyles.thead}"><tr class="${styles.tableHeader || ''}"><th>Nombre</th><th>Detalle</th></tr></thead><tbody>${rows}</tbody></table>`
              content = custom
                ? `<div class="${styles.tableWrapper || styles.tableContainer}">${markup}</div>`
                : `<div data-table-scroll class="${tableStyles.tableWrapper}"><div class="${tableStyles.tableContainer}">${markup}</div></div>`
              if (section.name === 'Inventory') content = `<div class="${styles.tableWrapper}">${content}</div>`
            }
            const pagination = `<div data-pagination class="${styles.pagination}"><button disabled>${section.name === 'Inventory' ? 'Anterior' : '&lt;'}</button><span>Página 1 de 3</span><button>${section.name === 'Inventory' ? 'Siguiente' : '&gt;'}</button></div>`
            // Installation details also renders a result count after its pagination.
            const summary = section.name === 'InstallationsDetails' && (mode === 'cards' || count > 1)
              ? '<div data-summary style="text-align:center;margin-top:8px;font-size:14px">Mostrando dispositivos</div>' : ''
            document.getElementById('root')!.innerHTML = `<div class="${layout.layoutContainer}">
              <div class="${layout.contentArea}"><main><div data-page class="${styles[section.root]}">
                <header class="${styles.topSection || styles.header}"><h1 class="${styles.title}">${section.name}</h1></header>
                <div class="${styles.searchRow || styles.searchContainer || ''}"><input aria-label="Buscar" placeholder="Buscar"></div>
                <div class="${styles[section.list]}">${content}${section.outside ? '' : pagination}</div>
                ${section.outside ? pagination : ''}${summary}
                ${section.name === 'InstallationsDetails' || section.name === 'Subscriptions' || section.name === 'Inventory' ? '<div data-tour-mount style="display:contents"></div>' : ''}
              </div>${section.name === 'InstallationsDetails' || section.name === 'Subscriptions' || section.name === 'Inventory' ? '' : '<div data-tour-mount style="display:contents"></div>'}</main><footer></footer></div></div>`
            if (section.name !== 'Tenants') {
              const reactPath = '/node_modules/.vite/deps/react.js'
              const domPath = '/node_modules/.vite/deps/react-dom_client.js'
              const tourPath = '/src/shared/components/Buttons/TourButton.tsx'
              const { createElement } = (await import(reactPath)).default
              const { createRoot } = (await import(domPath)).default
              const { default: TourButton } = await import(tourPath)
              createRoot(document.querySelector('[data-tour-mount]')!).render(createElement(TourButton, {
                label: 'Ayuda del recorrido', onClick: () => document.body.setAttribute('data-tour-clicked', 'true'),
              }))
              await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
            }
            // This system Chrome lacks CDP safe-area emulation. Substitute only env()
            // values in the loaded production styles; keep the rest of the cascade intact.
            if (safeArea) {
              for (const style of document.querySelectorAll('style[data-vite-dev-id]')) {
                style.textContent = style.textContent!.replaceAll('env(safe-area-inset-bottom, 0px)', `${safeArea}px`)
              }
            }
            // Wait for the real subscriptions entry animation before taking geometry.
            await Promise.all(document.getAnimations().map(animation => animation.finished))
          }, { section, mode, count, safeArea })

          const pagination = page.locator('[data-pagination]')
          const records = page.locator('[data-record]')
          await expect(records).toHaveCount(count)
          await expect(pagination.locator('button').first()).toBeDisabled()
          await expect(pagination.locator('button').last()).toBeEnabled()
          const measure = () => page.evaluate(() => {
            const pagination = document.querySelector('[data-pagination]')!.getBoundingClientRect()
            const root = document.querySelector('[data-page]')!
            const main = document.querySelector('main')!.getBoundingClientRect()
            const records = document.querySelectorAll('[data-record]')
            const last = records[records.length - 1].getBoundingClientRect()
            const end = (document.querySelector('[data-summary]') || document.querySelector('[data-pagination]'))!.getBoundingClientRect()
            return {
              paginationTop: pagination.top, paginationBottom: pagination.bottom,
              lastBottom: last.bottom, endBottom: end.bottom, mainBottom: main.bottom,
              bottomPadding: parseFloat(getComputedStyle(root).paddingBottom),
              mainHeight: main.height,
            }
          })
          const initial = await measure()
          if (safeArea) {
            expect(await pagination.evaluate(element => parseFloat(getComputedStyle(element).paddingBottom))).toBeGreaterThanOrEqual(safeArea)
          }
          // No allowance for page padding: that was the reported regression.
          expect.soft(initial.bottomPadding).toBe(0)
          expect.soft(Math.abs(initial.mainBottom - initial.endBottom)).toBeLessThanOrEqual(2)
          expect.soft(initial.paginationTop).toBeGreaterThanOrEqual(initial.lastBottom)

          if (length === 'short') {
            await expect(pagination).toBeInViewport({ ratio: 1 })
            expect.soft(initial.mainHeight).toBeGreaterThanOrEqual(viewport.height)
            expect.soft(initial.mainHeight).toBeLessThanOrEqual(viewport.height + 2)
          } else {
            expect.soft(initial.mainHeight).toBeGreaterThan(viewport.height)
            expect.soft(initial.paginationTop).toBeGreaterThan(viewport.height)
            // All vertical content is reachable; pagination never floats over a record.
            for (const index of [0, Math.floor(count / 2), count - 1]) {
              await records.nth(index).scrollIntoViewIfNeeded()
              const geometry = await measure()
              expect.soft(geometry.paginationTop).toBeGreaterThanOrEqual(geometry.lastBottom)
              const box = await records.nth(index).boundingBox()
              expect(box).not.toBeNull()
              expect.soft(box!.y).toBeGreaterThanOrEqual(0)
              expect.soft(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
            }
            await pagination.scrollIntoViewIfNeeded()
            // Fractional card heights can round the document's scroll extent by <1px.
            const footerBox = (await pagination.boundingBox())!
            expect(footerBox.y).toBeGreaterThanOrEqual(0)
            expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height + 1)
            for (const button of await pagination.locator('button').all()) {
              await expect(button).toBeInViewport({ ratio: 1 })
            }
          }

          const tour = page.getByRole('button', { name: 'Ayuda del recorrido' })
          if (section.name !== 'Tenants') {
            const tourBox = (await tour.boundingBox())!
            for (const control of await pagination.locator('button, span').all()) {
              const box = (await control.boundingBox())!
              const overlaps = box.x < tourBox.x + tourBox.width && box.x + box.width > tourBox.x
                && box.y < tourBox.y + tourBox.height && box.y + box.height > tourBox.y
              expect.soft(overlaps, 'tour must not cover pagination controls').toBe(false)
              expect.soft(box.x + box.width).toBeLessThanOrEqual(viewport.width)
            }
            await tour.focus()
            await expect(tour).toBeFocused()
            await tour.click()
            await expect(page.locator('body')).toHaveAttribute('data-tour-clicked', 'true')
            // Restricted roles omit the tour; the footer must still reach the bottom.
            await tour.evaluate(button => button.remove())
            const withoutTour = await measure()
            expect.soft(Math.abs(withoutTour.mainBottom - withoutTour.endBottom)).toBeLessThanOrEqual(2)
            if (length === 'short') expect.soft(withoutTour.mainHeight).toBeLessThanOrEqual(viewport.height + 2)
          }

          // Shared tables retain horizontal scrolling on mobile instead of clipping columns.
          const tableScroll = page.locator('[data-table-scroll]')
          if (mode === 'table' && viewport.width === 390 && await tableScroll.count()) {
            const overflow = await tableScroll.evaluate(element => {
              element.scrollLeft = element.scrollWidth
              return { moved: element.scrollLeft, height: element.clientHeight, contentHeight: element.scrollHeight }
            })
            expect(overflow.moved).toBeGreaterThan(0)
            expect(overflow.contentHeight).toBeLessThanOrEqual(overflow.height + 1)
          }
          // No footer in loading/empty/single-page conditional states: retain original padding.
          if (length === 'short') {
            await pagination.evaluate(element => element.remove())
            await page.locator('[data-summary]').evaluateAll(elements => elements.forEach(element => element.remove()))
            expect(await page.locator('[data-page]').evaluate(element => parseFloat(getComputedStyle(element).paddingBottom))).toBeGreaterThan(0)
          }
        })
      }
    }
  }
}
