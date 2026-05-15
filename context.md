# Code Context

## Files Retrieved
1. `src/layouts/MainLayout.tsx` (lines 1-131) - current global/home onboarding tour lives here, uses Driver.js and targets home routes plus `data-tour="open-settings"`.
2. `src/shared/components/TopBar/TopBar.tsx` (lines 1-214) - current configuration gear button is here; it navigates to `/configuracion` and is the only rendered `data-tour="open-settings"` target.
3. `src/shared/components/Nav/Nav.tsx` (lines 1-385) - sidebar navigation; currently no Configuración section except super-admin Panel Admin. This is where a settings sidebar item should be added.
4. `src/features/installations/hooks/useInstallationsTour.ts` (lines 1-94) - installations-specific tour currently starts with the Leonix welcome modal/card.
5. `src/pages/Installations.tsx` (lines 330-390, 690-708) - Installations page wires `useInstallationsTour()` into a floating `TourButton`, and includes tour anchors for create/search steps.
6. `src/pages/Home.tsx` (lines 1-8) and `src/features/home/components/HomeDashboard.tsx` (lines 1-114) - home page currently only renders dashboard content; no home-specific tour hook/button in the page component.
7. `src/router/routeTranslations.ts` (lines 1-55) - translated route keys include `settings`, e.g. Spanish `configuracion`, English `settings`.
8. `src/router/createTranslatedRouter.tsx` (lines 35-100) - settings route already exists under `MainLayout` as `RoleProtectedRoute section="configuracion"`.
9. `src/store/layoutStore.ts` (lines 1-21) - Zustand persisted sidebar collapsed state used by `MainLayout`, `TopBar`, and `Nav`.
10. `src/features/assets/hooks/useAssetsTour.ts` (lines 1-105), `src/features/forms/hooks/useFormsTour.ts` (lines 1-75), `src/features/installationsDetails/hooks/useInstallationDetailTour.ts` (lines 1-80) - other tours also target `[data-tour="open-settings"]`.
11. `src/i18n/locales/es.json` (lines 15-26, 835-855, 2120-2145) and `src/i18n/locales/en.json` (lines 15-27, 852-868, 2050-2075) - nav/settings labels and tour text. Similar keys exist in other locale files.

## Key Code

Current home/global onboarding is already implemented in `MainLayout`:

```tsx
// src/layouts/MainLayout.tsx:18-19
const ONBOARDING_TOUR_KEY = 'onboarding-tour-v2-shown'
const HOME_ROUTES = new Set(Object.values(routeTranslations).map(({ home }) => `/${home}`))
```

```tsx
// src/layouts/MainLayout.tsx:41-115
useEffect(() => {
  if (!isAuthenticated) return
  if (localStorage.getItem(ONBOARDING_TOUR_KEY) === 'true') return
  if (!HOME_ROUTES.has(location.pathname)) return

  const runOnboardingTour = () => {
    const onboardingTour = driver({
      showProgress: true,
      steps: [
        { popover: { title: t('home.tour.welcome.title'), description: t('home.tour.welcome.description') } },
        { element: '[data-tour="open-settings"]', popover: { title: t('installations.tour.createInstallationType.title') } },
        { element: '[data-tour="nav-assets"]', ... },
        { element: '[data-tour="nav-installations"]', ... },
      ],
      onDestroyed: () => localStorage.setItem(ONBOARDING_TOUR_KEY, 'true'),
    })
    onboardingTour.drive()
  }
}, [dark, isAuthenticated, location.pathname, t])
```

Current installations tour starts with the same Leonix welcome text, but under `installations.tour.welcome`:

```tsx
// src/features/installations/hooks/useInstallationsTour.ts:29-45
steps: [
  {
    popover: {
      title: t('installations.tour.welcome.title'),
      description: t('installations.tour.welcome.description'),
      showButtons: ['next', 'close']
    }
  },
  {
    element: '[data-tour="open-settings"]',
    popover: {
      title: t('installations.tour.createInstallationType.title'),
      description: t('installations.tour.createInstallationType.description'),
      side: "left",
      align: 'start'
    }
  },
```

Current TopBar config button:

```tsx
// src/shared/components/TopBar/TopBar.tsx:200-207
<button
  className={styles.actionButton}
  aria-label="Configuración"
  onClick={() => navigate('/configuracion')}
  data-tour="open-settings"
>
  <Settings size={20} />
</button>
```

Current Nav has route variables for many translated paths, but not `settingsRoute`:

```tsx
// src/shared/components/Nav/Nav.tsx:39-48
const homeRoute = getRoute('home')
...
const auditRoute = getRoute('audit')
```

Current Nav section order includes Home, work orders, maintenance, installations, assets, operation, Panel Admin, audit. No normal settings/config item exists:

```tsx
// src/shared/components/Nav/Nav.tsx:239-380
<NavLink to={homeRoute}>...</NavLink>
...
<li data-tour="nav-installations"><NavLink to={installationsRoute}>...</NavLink></li>
<li data-tour="nav-assets"><NavLink to={assetsRoute}>...</NavLink></li>
...
{(isAdminUser || isSuperAdminUser) && <NavLink to={auditRoute}>...</NavLink>}
```

Other tours depend on the same `open-settings` target:

```text
src/features/installations/hooks/useInstallationsTour.ts:38
src/features/forms/hooks/useFormsTour.ts:36
src/features/installationsDetails/hooks/useInstallationDetailTour.ts:39
src/features/assets/hooks/useAssetsTour.ts:53,92
src/layouts/MainLayout.tsx:78
```

## Architecture

- The app uses `MainLayout` for protected pages. It renders `<Nav />`, `<TopBar />`, an `<Outlet />`, and `<Footer />`.
- Translated routes are centralized in `routeTranslations`; `useTranslatedRoutes().getRoute('settings')` should be used in components instead of hardcoded `/configuracion` when possible.
- Settings page routing already exists for all languages via `createTranslatedRouter.tsx`; no new route is needed.
- `Nav` is the actual sidebar. It controls visibility by role (`isTechnicianUser`, `isSuperAdminUser`, `isClientUser`, `isAdminUser`) and uses `useLayoutStore` to handle collapsed/sidebar state.
- `TopBar` currently handles language, theme, notifications, and the settings icon. Removing the configuration icon here also removes the only current DOM anchor for `data-tour="open-settings"`.
- Driver.js tours are split:
  - Global first-run onboarding in `MainLayout`, gated by `localStorage['onboarding-tour-v2-shown']`, runs only on home route aliases.
  - Feature tours in hooks, each with its own localStorage completion key and floating `TourButton` in the page.
- Home currently has no page-level `TourButton`/hook; the only home guide is automatic and global from `MainLayout`.

## Exact Current Flow

1. Authenticated user reaches a home path (`/inicio`, `/home`, etc.).
2. `MainLayout` checks `localStorage['onboarding-tour-v2-shown']` and `HOME_ROUTES`.
3. If not completed, after 350ms Driver.js starts:
   - Step 1: unanchored welcome card: `home.tour.welcome.title` = `¡Bienvenido a Leonix!`.
   - Step 2: targets `[data-tour="open-settings"]`, currently TopBar gear button.
   - Step 3: targets sidebar assets item `[data-tour="nav-assets"]`.
   - Step 4: targets sidebar installations item `[data-tour="nav-installations"]`.
4. On destroy, `onboarding-tour-v2-shown` is set to `true`.
5. In Installations, the floating `TourButton` currently has inverted-looking behavior: when `tourCompleted` is `true`, it calls `startTour`; when false, it calls `skipTour` (same pattern may exist elsewhere). The first `startTour` step is the Leonix welcome card from `installations.tour.welcome`, then it points to `[data-tour="open-settings"]`, then create installation, then search/filter.
6. TopBar gear click navigates hardcoded to `/configuracion`, not the translated settings route.

## Minimal Implementation Plan

1. **Move the `open-settings` anchor from TopBar to Sidebar**
   - In `TopBar.tsx`, remove `Settings` from lucide import if no longer used, remove `useNavigate` if only used by settings, and delete the settings button at lines 200-207.
   - In `Nav.tsx`, add `const settingsRoute = getRoute('settings')` near other route constants.
   - Add a normal sidebar `<li data-tour="open-settings">` with `<NavLink to={settingsRoute}> <Settings size={20} /> <span>{t('nav.settings')}</span> </NavLink>`.
   - Likely role guard: align with route permission `section="configuracion"`. Existing request says add configuration as a Sidebar section; safest starting point is visible to non-super-admin, non-client users (similar Home/Operation) unless product wants clients/technicians to see it. Verify permissions in `RoleProtectedRoute` if changing visibility broadly.

2. **Keep/update home guide**
   - Since `MainLayout` already implements a home-only welcome guide, update its step 2 to point to the new sidebar settings item. If the sidebar item uses the same `data-tour="open-settings"`, no selector change is needed.
   - Adjust side/align for sidebar target (`side: 'right'` is likely better than current `left`, because the target moves from TopBar right side to left sidebar).
   - If user expects a manual home tourist guide button, create `src/features/home/hooks/useHomeTour.ts` or move the current `MainLayout` tour into a reusable home hook and render `TourButton` from `HomeDashboard`. Minimal alternative: keep the automatic `MainLayout` tour only.

3. **Remove Leonix welcome from installations tour**
   - In `useInstallationsTour.ts`, remove the first unanchored `installations.tour.welcome` step so Installations begins with configuration or create-installation guidance.
   - Optionally remove unused `ONBOARDING_TOUR_KEY` and `onboardingCompleted` lines in `useInstallationsTour.ts`; `onboardingCompleted` is currently assigned and unused.
   - Consider whether `installations.tour.welcome` i18n keys should remain for backward compatibility or be cleaned later across all locale files.

4. **Preserve other tours**
   - Because assets/forms/installation-detail tours also target `[data-tour="open-settings"]`, make sure the new sidebar Configuración item exists in every layout state where those tours run.
   - Risk: if sidebar is collapsed, Driver.js can still target the icon-only item, but label text is hidden. That is probably acceptable; if not, tours may need to expand sidebar first.

5. **Routing/i18n**
   - Use `getRoute('settings')`, not hardcoded `/configuracion`, in the new Nav item.
   - `nav.settings` already exists at least in ES/EN, and likely in all locales.
   - Existing settings route exists for all languages; no route change needed.

## Start Here

Start with `src/shared/components/Nav/Nav.tsx`: it is the sidebar, already imports `Settings`, already uses translated routes, and is the correct place to add the new Configuración section plus the `data-tour="open-settings"` anchor. Then update `src/shared/components/TopBar/TopBar.tsx` and `src/features/installations/hooks/useInstallationsTour.ts`.

## Supervisor coordination

No blocking decision required for scouting. Engram save was requested, but no Engram/memory tool is available in this subagent toolset, so no memory write was possible.
