# AGENTS.md — frontGMAO Coding Standards

## Project Overview

- **Stack**: React 19 + TypeScript + Vite 6 + Zustand + Vitest + Playwright
- **Architecture**: Feature-based (feature-sliced design patterns)
- **Language**: Spanish for UI, English for code identifiers

---

## 1. Project Structure

```
src/
├── features/           # Feature-based modules
│   └── {feature}/
│       ├── hooks/      # Custom hooks (use*)
│       ├── services/  # API services
│       ├── components/ # Feature-specific components
│       ├── validators/ # Yup validation schemas
│       └── types/      # Feature-specific types
├── shared/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Shared hooks
│   ├── services/      # Shared services
│   ├── utils/         # Utilities
│   └── constants.ts   # App constants
├── store/             # Zustand stores (root-level state)
├── pages/             # Route pages
├── layouts/           # Layout components
└── i18n/              # Internationalization
```

**REJECT** — Adding files outside these locations without justification.

---

## 2. State Management (Zustand)

### Store Patterns

```typescript
// REQUIRE: Use persist middleware for persisted state
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  // REQUIRE: Define interfaces explicitly (no any unless necessary)
  user: string | null
  login: (data: LoginData) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (data) => set({ user: data.user }),
      logout: () => set({ user: null }),
    }),
    { name: "auth-storage" } // REQUIRE: Named storage key
  )
)
```

**REQUIRE**:
- Name exports as `use{Feature}Store`
- Use TypeScript interfaces for state
- Use persist middleware for localStorage sync
- Include storage key name

**PREFER**:
- Single-responsibility stores
- Normalized state (avoid nested objects when possible)

---

## 3. Custom Hooks

### Naming Convention

- **REQUIRE**: Prefix with `use` (e.g., `useClients`, `useInstallations`)
- **PREFER**: Colocate in `src/features/{feature}/hooks/`
- **PREFER**: Return tuple `[state, actions]` pattern

```typescript
// src/features/clients/hooks/useClients.ts
export const useClients = () => {
  const clients = useSelector((state) => state.clients)
  const fetchClients = useAction((state) => state.fetchClients)
  
  return { clients, fetchClients }
}
```

---

## 4. Services (API Layer)

### API Service Pattern

```typescript
// src/features/clients/services/clientServices.ts
const API_URL = import.meta.env.VITE_API_URL || "/api/"

export const fetchClients = async (): Promise<Client[]> => {
  const response = await fetch(`${API_URL}clientes`, {
    headers: getAuthHeaders(), // PREFER: Use shared header utils
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener clientes")
  }
  
  return response.json()
}
```

**REJECT**:
- Hardcoded URLs without env variable fallback
- Direct fetch without error handling

**PREFER**:
- Reusable service functions
- Centralized error handling
- Type-safe responses

---

## 5. Components

### Component Structure

```typescript
// src/features/clients/components/ClientList.tsx
import { useClients } from "../hooks/useClients"

interface ClientListProps {
  onSelect?: (client: Client) => void
}

export const ClientList = ({ onSelect }: ClientListProps) => {
  const { clients, isLoading } = useClients()
  
  if (isLoading) return <Skeleton />
  
  return (
    <ul>
      {clients.map((client) => (
        <ClientCard key={client._id} client={client} onSelect={onSelect} />
      ))}
    </ul>
  )
}
```

**REQUIRE**:
- Export components as named exports
- Define prop interfaces explicitly
- Handle loading states
- Use key props on lists

---

## 6. Testing (Vitest + Playwright)

### Test Organization

```
tests/
├── unit/              # Component/hook logic tests
├── integration/       # API integration tests  
├── security/          # XSS, CSRF, headers tests
└── e2e/               # Playwright E2E tests
```

### Unit Test Pattern

```typescript
// tests/unit/hooks/useViewMode.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useViewMode } from "../../src/shared/hooks/useViewMode"

describe("useViewMode", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  
  it("should toggle view mode", () => {
    const { result } = renderHook(() => useViewMode())
    
    act(() => {
      result.current.toggleView()
    })
    
    expect(result.current.viewMode).toBe("grid")
  })
})
```

**REQUIRE**:
- Run `bun run test:unit` before committing
- Tests must pass (STATUS: PASSED)
- Cover critical paths

---

## 7. Linting & Type Checking

### Pre-commit Checklist

```bash
# REJECT: These must pass before commit
bun run lint        # ESLint (allow warnings, no errors)
bun run type-check # TypeScript strict mode
bun run test:unit  # Unit tests must pass
```

### ESLint Rules

- **PREFER**: `const` over `let`
- **REJECT**: Unused variables
- **REJECT**: `any` types (use `unknown` or specific types)
- **PREFER**: Explicit return types for complex functions

---

## 8. Git Conventions

### Commit Messages (Conventional Commits)

```
feat: Descripción breve del cambio
fix: Descripción breve del fix
refactor: Descripción breve del refactor
test: Descripción breve del cambio en tests
docs: Descripción breve de documentación
```

**PREFER**:
- Spanish for feat/fix descriptions
- Keep subject under 72 characters
- Reference issues when applicable

### Branch Naming

```
feature/{ticket}-descripcion-corta
fix/{ticket}-descripcion-corta
```

---

## 9. Response Format

When AI agents complete tasks, they must output:

```
STATUS: PASSED
```

Or if issues exist:

```
STATUS: FAILED
Reason: [explanation]
```

---

## 10. Prohibited Patterns

| Pattern | Reason |
|---------|--------|
| `any` type without justification | Type safety |
| Inline styles (use Tailwind classes) | Consistency |
| Direct DOM manipulation | React paradigm |
| Console.log in production | Debug only |
| Hardcoded strings (use i18n) | Localization |
| fetch without error handling | Resilience |

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server |
| `bun run lint` | ESLint check |
| `bun run type-check` | TypeScript check |
| `bun run test:unit` | Run unit tests |
| `bun run test:e2e` | Run Playwright tests |
| `bun run ci` | Full CI pipeline |