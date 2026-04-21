# Skill Registry — frontGMAO

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

---

## Project Context

- **Stack**: React 19 + TypeScript + Vite 6 + Zustand + Vitest + Playwright
- **Backend**: Node.js 20 + Express 5 + MongoDB at `/home/jleone/work/backPanel`
- **Architecture**: Feature-based (feature-sliced design patterns)
- **Persistence**: engram (SDD artifacts)
- **Strict TDD**: enabled ✅

---

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| sdd init, iniciar sdd, openspec init | sdd-init | ~/.config/opencode/skills/sdd-init/SKILL.md |
| When orchestrator launches to explore | sdd-explore | ~/.config/opencode/skills/sdd-explore/SKILL.md |
| When orchestrator launches to propose | sdd-propose | ~/.config/opencode/skills/sdd-propose/SKILL.md |
| When orchestrator launches to write specs | sdd-spec | ~/.config/opencode/skills/sdd-spec/SKILL.md |
| When orchestrator launches to design | sdd-design | ~/.config/opencode/skills/sdd-design/SKILL.md |
| When orchestrator launches to create tasks | sdd-tasks | ~/.config/opencode/skills/sdd-tasks/SKILL.md |
| When orchestrator launches to implement | sdd-apply | ~/.config/opencode/skills/sdd-apply/SKILL.md |
| When orchestrator launches to verify | sdd-verify | ~/.config/opencode/skills/sdd-verify/SKILL.md |
| When orchestrator launches to archive | sdd-archive | ~/.config/opencode/skills/sdd-archive/SKILL.md |
| When orchestrator launches for onboarding | sdd-onboard | ~/.config/opencode/skills/sdd-onboard/SKILL.md |
| Go tests, teatest, Bubbletea testing | go-testing | ~/.config/opencode/skills/go-testing/SKILL.md |
| create skill, add agent instructions | skill-creator | ~/.config/opencode/skills/skill-creator/SKILL.md |
| update skills, skill registry, actualizar skills | skill-registry | ~/.config/opencode/skills/skill-registry/SKILL.md |
| Creating GitHub issue, reporting bug | issue-creation | ~/.config/opencode/skills/issue-creation/SKILL.md |
| Creating pull request, opening PR | branch-pr | ~/.config/opencode/skills/branch-pr/SKILL.md |
| judgment day, dual review, juzgar | judgment-day | ~/.config/opencode/skills/judgment-day/SKILL.md |

## Compact Rules

### sdd-init
- Detect real tech stack from package.json, configs — never guess
- ALWAYS detect testing capabilities (test runner, layers, coverage, quality tools)
- ALWAYS persist testing capabilities as separate observation/section
- Determine strict_tdd from agent config → openspec/config → default true if test runner exists
- Write `.atl/skill-registry.md` in ALL modes; save to engram if available
- For engram mode: use `sdd-init/{project}` as title and topic_key

### sdd-explore
- Read relevant code before proposing solutions
- Document findings with file paths and line numbers
- Identify risks, constraints, and unknowns
- Output: exploration report with recommendations

### sdd-propose
- Include rollback plan for risky changes
- Identify affected modules/packages
- Document success criteria
- Output: proposal with scope, approach, and feasibility

### sdd-spec
- Use Given/When/Then format for scenarios
- Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY)
- Cover happy path, edge cases, and error scenarios
- Output: delta specifications for all affected domains

### sdd-design
- Include sequence diagrams for complex flows
- Document architecture decisions with rationale (ADRs)
- Define interfaces and data contracts
- Output: technical design document

### sdd-tasks
- Group tasks by phase (infrastructure, implementation, testing)
- Use hierarchical numbering (1.1, 1.2, etc.)
- Keep tasks small enough to complete in one session
- Output: task checklist with acceptance criteria

### sdd-apply
- Follow existing code patterns and conventions
- Load relevant coding skills for the project stack
- Run tests if test infrastructure exists
- Update apply-progress artifact after each batch

### sdd-verify
- Run tests if test infrastructure exists
- Compare implementation against every spec scenario
- Check for security, performance, and accessibility
- Output: verification report with pass/fail status

### sdd-archive
- Warn before merging destructive deltas (large removals)
- Sync delta specs to main specs
- Generate archive report with lineage
- Clean up temporary artifacts

### go-testing
- Use `teatest` for Bubbletea TUI testing
- Mock external dependencies
- Test update logic separately from view rendering
- Use table-driven tests for multiple scenarios

### skill-creator
- Follow Agent Skills specification format
- Include frontmatter with name, description, trigger
- Document Critical Patterns and Rules sections
- Place skill in appropriate skills directory

### skill-registry
- Scan user skills from `~/.config/opencode/skills/` and project `.agent/skills/`
- Skip `sdd-*`, `_shared`, `skill-registry` directories
- Generate compact rules (5-15 lines per skill)
- ALWAYS write `.atl/skill-registry.md`
- ALSO save to engram with topic_key `skill-registry`

### issue-creation
- Follow issue-first workflow
- Include reproduction steps for bugs
- Document expected vs actual behavior
- Reference related changes when applicable

### branch-pr
- Create feature branch before making changes
- Follow branch naming: `feature/{ticket}-description`
- Include tests in PR
- Reference issue number in PR description

### judgment-day
- Launch two independent blind judges simultaneously
- Synthesize findings from both judges
- Apply fixes and re-judge until both pass
- Escalate after 2 iterations if still failing

---

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /home/jleone/work/frontGMAO/AGENTS.md | Main coding standards and conventions |

Read the convention files listed above for project-specific patterns and rules.

### State Management (from AGENTS.md)
- **Store Location**: `src/store/`
- **Pattern**: Zustand with persist middleware
- **Naming**: `use{Feature}Store` (e.g., `useAuthStore`)
- **Requirement**: TypeScript interfaces for state, named storage key

### API Services (from AGENTS.md)
- **Location**: `src/features/{feature}/services/`
- **Pattern**: Use `import.meta.env.VITE_API_URL` with fallback to `/api/`
- **Requirement**: Error handling for all fetch calls

### Custom Hooks (from AGENTS.md)
- **Location**: `src/features/{feature}/hooks/`
- **Naming**: Prefix with `use` (e.g., `useClients`, `useInstallations`)
- **Pattern**: Return object with state and actions

### Components (from AGENTS.md)
- **Requirement**: Named exports, explicit prop interfaces
- **Requirement**: Handle loading states
- **Requirement**: Use key props on lists
- **Reject**: `any` type, inline styles, direct DOM manipulation

### Testing (from AGENTS.md)
- **Unit**: `tests/unit/` (Vitest + Testing Library)
- **Integration**: `tests/integration/` (Vitest + MSW)
- **Security**: `tests/security/` (XSS, CSRF, headers)
- **E2E**: `tests/e2e/` (Playwright)
- **Requirement**: Run `npm run test:unit` before committing
- **Coverage**: 80% threshold for lines, functions, branches, statements

### Git Conventions (from AGENTS.md)
- **Branch**: `feature/{ticket}-descripcion-corta` / `fix/{ticket}-descripcion-corta`
- **Commits**: Conventional Commits (Spanish descriptions)
  - `feat: Descripción`
  - `fix: Descripción`
  - `refactor: Descripción`
  - `test: Descripción`
  - `docs: Descripción`
- **Reject**: "Co-Authored-By" or AI attribution

### Linting & Type Checking (from AGENTS.md)
- **Linter**: ESLint with TypeScript support
- **Type Checker**: `tsc --noEmit`
- **Pre-commit**: `npm run lint`, `npm run type-check`, `npm run test:unit`
- **Rules**: `const` over `let`, no unused variables, no explicit `any`

---

## Engram Integration

- **Artifact Backend**: engram (primary persistence)
- **Project Context**: `sdd-init/frontGMAO`
- **Testing Capabilities**: `sdd/frontGMAO/testing-capabilities`
- **Skill Registry**: `skill-registry` (topic_key)
- **Topic Key Format**: `sdd/{change-name}/{artifact-type}`
- **Recovery Protocol**: `mem_search` → `mem_get_observation`

---

## Project Structure

```
/home/jleone/work/frontGMAO/
├── src/
│   ├── features/          # Feature-based modules
│   │   ├── assets/
│   │   ├── auth/
│   │   ├── calendar/
│   │   ├── clients/
│   │   ├── deviceForms/
│   │   ├── forms/
│   │   ├── home/
│   │   ├── installations/
│   │   ├── installationsDetails/
│   │   ├── maintenanceRequests/
│   │   ├── manuals/
│   │   ├── profile/
│   │   ├── settings/
│   │   ├── subscriptions/
│   │   ├── tenants/
│   │   └── workOrders/
│   ├── shared/            # Reusable components, hooks, services, utils
│   ├── store/             # Zustand stores
│   ├── pages/             # Route pages
│   ├── layouts/           # Layout components
│   ├── router/            # Routing configuration
│   ├── services/          # Global API services
│   ├── i18n/              # Internationalization
│   └── utils/             # Utilities
├── tests/
│   ├── unit/              # Unit tests (Vitest)
│   ├── integration/       # Integration tests
│   ├── security/          # Security tests
│   └── e2e/               # E2E tests (Playwright)
├── .atl/                  # Skill registry (gitignored)
└── AGENTS.md              # Coding standards
```

---

## Backend Context (backPanel)

Located at `/home/jleone/work/backPanel`:
- **Stack**: Node.js 20 + Express 5 + MongoDB/Mongoose
- **Testing**: Vitest + Supertest + mongodb-memory-server
- **Load Testing**: k6
- **Security**: helmet, express-rate-limit, CSRF protection
- **Structure**: middleware/, routes/, models/, services/

---

*Last Updated: 2026-04-14*
