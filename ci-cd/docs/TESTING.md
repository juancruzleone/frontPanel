# Guía de Testing

## Tipos de Tests

El proyecto implementa una estrategia completa de testing:

1. **Unit Tests** - Tests de funciones y componentes aislados
2. **Integration Tests** - Tests de interacción entre componentes
3. **Security Tests** - Tests de vulnerabilidades y seguridad
4. **E2E Tests** - Tests de flujos completos de usuario

## Configuración

### Herramientas

- **Vitest** - Test runner y framework
- **Testing Library** - Testing de componentes React
- **Playwright** - Tests E2E
- **MSW** - Mock de API calls

### Archivos de Configuración

- `vitest.config.ts` - Configuración de Vitest
- `playwright.config.ts` - Configuración de Playwright
- `tests/setup.ts` - Setup global de tests

## Unit Tests

### Ubicación
`tests/unit/`

### Ejecutar

```bash
bun run test:unit
```

### Ejemplo

```typescript
// tests/unit/sanitizer.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeInput } from '@/utils/sanitizer'

describe('sanitizeInput', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>'
    const result = sanitizeInput(input)
    expect(result).not.toContain('<script>')
  })
})
```

### Cobertura

```bash
bun run test:coverage
```

Target: 80% de cobertura mínima

## Integration Tests

### Ubicación
`tests/integration/`

### Ejecutar

```bash
bun run test:integration
```

### Ejemplo

```typescript
// tests/integration/auth.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/features/auth/LoginForm'

describe('LoginForm Integration', () => {
  it('should login successfully', async () => {
    render(<LoginForm />)
    
    await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    })
  })
})
```

## Security Tests

### Ubicación
`tests/security/`

### Ejecutar

```bash
bun run test:security
```

### Categorías

1. **XSS Protection** - `xss.test.ts`
2. **CSRF Protection** - `csrf.test.ts`
3. **Security Headers** - `headers.test.ts`

### Ejemplo

```typescript
// tests/security/xss.test.ts
describe('XSS Protection', () => {
  it('should block script injection', () => {
    const malicious = '<script>alert("XSS")</script>'
    const sanitized = sanitizeInput(malicious)
    expect(sanitized).not.toContain('<script>')
  })
  
  it('should block event handlers', () => {
    const malicious = '<img onerror="alert(1)">'
    const sanitized = sanitizeInput(malicious)
    expect(sanitized).not.toContain('onerror=')
  })
})
```

## E2E Tests

### Ubicación
`tests/e2e/`

### Ejecutar

```bash
# Headless
bun run test:e2e

# Con UI
bun run test:e2e:ui

# Debug
bun run test:e2e:debug
```

### Ejemplo

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/')
  
  await page.fill('[name="email"]', 'test@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

## Mocking

### API Calls con MSW

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      token: 'fake-jwt-token',
      user: { id: 1, email: 'test@test.com' }
    })
  })
]
```

### localStorage Mock

```typescript
// tests/setup.ts
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
}

global.localStorage = createLocalStorageMock() as any
```

## Best Practices

### 1. Arrange-Act-Assert

```typescript
it('should do something', () => {
  // Arrange
  const input = 'test'
  
  // Act
  const result = doSomething(input)
  
  // Assert
  expect(result).toBe('expected')
})
```

### 2. Descriptive Test Names

```typescript
// ❌ Malo
it('works', () => {})

// ✅ Bueno
it('should sanitize script tags from user input', () => {})
```

### 3. Test One Thing

```typescript
// ❌ Malo - testea múltiples cosas
it('should validate and sanitize input', () => {
  expect(isValid(input)).toBe(true)
  expect(sanitize(input)).toBe(expected)
})

// ✅ Bueno - un test por cosa
it('should validate input', () => {
  expect(isValid(input)).toBe(true)
})

it('should sanitize input', () => {
  expect(sanitize(input)).toBe(expected)
})
```

### 4. Avoid Test Interdependence

```typescript
// ❌ Malo - tests dependen uno del otro
let user: User

it('should create user', () => {
  user = createUser()
})

it('should update user', () => {
  updateUser(user) // depende del test anterior
})

// ✅ Bueno - tests independientes
it('should create user', () => {
  const user = createUser()
  expect(user).toBeDefined()
})

it('should update user', () => {
  const user = createUser() // setup propio
  updateUser(user)
  expect(user.updated).toBe(true)
})
```

## CI/CD Integration

### GitHub Actions

Los tests se ejecutan automáticamente en:
- Pull requests
- Push a `main` y `develop`
- Manualmente

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: bun run ci:test
```

### Pre-commit Hooks

```bash
# Instalar husky
bun add -d husky

# Configurar pre-commit
bunx husky add .husky/pre-commit "bun run test"
```

## Debugging Tests

### Vitest UI

```bash
bun run test:ui
```

Abre interfaz web interactiva para debugging.

### Playwright Debug

```bash
bun run test:e2e:debug
```

Abre Playwright Inspector para step-by-step debugging.

### VS Code

Configuración en `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## Performance Testing

### Lighthouse CI

```bash
bun run test:lighthouse
```

Verifica:
- Performance score > 90
- Accessibility score > 90
- Best practices score > 90
- SEO score > 90

### Bundle Size

```bash
bun run build
bun run analyze
```

## Troubleshooting

### Tests lentos

```bash
# Ejecutar en paralelo
bun run test -- --threads

# Ejecutar solo tests modificados
bun run test -- --changed
```

### Tests flaky

```bash
# Ejecutar múltiples veces
bun run test -- --retry=3
```

### Memory leaks

```bash
# Ejecutar con más memoria
NODE_OPTIONS=--max_old_space_size=4096 bun run test
```

## Métricas de Calidad

### Targets

- **Cobertura**: > 80%
- **Tests pasando**: 100%
- **Tiempo de ejecución**: < 30s (unit + integration)
- **E2E**: < 5min

### Reportes

```bash
# Coverage report
bun run test:coverage

# HTML report
open coverage/index.html
```

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)
- [MSW Docs](https://mswjs.io/)
