# Skill Registry — frontGMAO

## Project Context

- **Stack**: React 19 + TypeScript + Vite 6 + Zustand + Vitest + Playwright
- **Backend**: Node.js/Express/MongoDB at backPanel repo
- **Architecture**: Feature-based (feature-sliced design patterns)

---

## Available Skills

### SDD Skills (Spec-Driven Development)

| Skill | Path | Purpose |
|-------|------|---------|
| `sdd-init` | `~/.claude/skills/sdd-init/SKILL.md` | Initialize SDD context in project |
| `sdd-explore` | `~/.claude/skills/sdd-explore/SKILL.md` | Explore and investigate ideas |
| `sdd-propose` | `~/.claude/skills/sdd-propose/SKILL.md` | Create change proposal with intent, scope, approach |
| `sdd-spec` | `~/.claude/skills/sdd-spec/SKILL.md` | Write specifications with requirements and scenarios |
| `sdd-design` | `~/.claude/skills/sdd-design/SKILL.md` | Create technical design document |
| `sdd-tasks` | `~/.claude/skills/sdd-tasks/SKILL.md` | Break down change into implementation tasks |
| `sdd-apply` | `~/.claude/skills/sdd-apply/SKILL.md` | Implement tasks following specs |
| `sdd-verify` | `~/.claude/skills/sdd-verify/SKILL.md` | Validate implementation matches specs |
| `sdd-archive` | `~/.claude/skills/sdd-archive/SKILL.md` | Sync delta specs and archive completed change |

### Utility Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `skill-registry` | `~/.claude/skills/skill-registry/SKILL.md` | Create/update skill registry |
| `go-testing` | `~/.claude/skills/go-testing/SKILL.md` | Go testing patterns (not used) |
| `skill-creator` | `~/.claude/skills/skill-creator/SKILL.md` | Create new AI agent skills |

### GGA Skills (Gentleman Guardian Angel)

| Skill | Path | Purpose |
|-------|------|---------|
| `gga-branch-pr` | `.agent/skills/gga-branch-pr/SKILL.md` | Branch and PR workflow standards |
| `gga-commit-hygiene` | `.agent/skills/gga-commit-hygiene/SKILL.md` | Conventional commits format |
| `gga-docs-alignment` | `.agent/skills/gga-docs-alignment/SKILL.md` | Documentation sync with code |
| `gga-issue-creation` | `.agent/skills/gga-issue-creation/SKILL.md` | Issue-first workflow |
| `gga-shellcheck-standards` | `.agent/skills/gga-shellcheck-standards/SKILL.md` | Shell script quality |
| `gga-testing-coverage` | `.agent/skills/gga-testing-coverage/SKILL.md` | Test coverage requirements |

---

## Project Conventions

### State Management
- **Store Location**: `src/store/`
- **Pattern**: Zustand with persist middleware
- **Naming**: `use{Feature}Store` (e.g., `useAuthStore`)

### API Services
- **Location**: `src/features/{feature}/services/`
- **Pattern**: Use `import.meta.env.VITE_API_URL` fallback to `/api/`

### Hooks
- **Location**: `src/features/{feature}/hooks/`
- **Naming**: Prefix with `use` (e.g., `useClients`, `useInstallations`)

### Testing
- **Unit**: `tests/unit/` (Vitest)
- **Integration**: `tests/integration/`
- **Security**: `tests/security/`
- **E2E**: `tests/e2e/` (Playwright)

### Git
- **Branch**: `feature/{ticket}-description` / `fix/{ticket}-description`
- **Commit**: Conventional Commits (Spanish descriptions)

---

## Workflow Commands

| Command | Action |
|---------|--------|
| `/sdd-init` | Initialize SDD in project |
| `/sdd-explore <topic>` | Explore codebase/requirements |
| `/sdd-new <change>` | Start new change (explore + propose) |
| `/sdd-continue [change]` | Continue missing artifact in chain |
| `/sdd-ff [change>` | Fast-forward: propose → spec → design → tasks |
| `/sdd-apply [change]` | Implement tasks in batches |
| `/sdd-verify [change]` | Validate implementation |
| `/sdd-archive [change]` | Archive completed change |

---

## Engram Integration

- **Artifact Backend**: engram (primary), openspec (fallback)
- **Topic Key Format**: `sdd/{change-name}/{artifact}`
- **Recovery**: Use `mem_search` + `mem_get_observation`

---

## Code Review Setup

For GGA code review integration (optional future):
- Enable via `/sdd-init` with code review flag
- Use `sdd-verify` phase for PR validation
- Integrate with external review tools
