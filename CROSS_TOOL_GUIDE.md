# Cross-Tool Development Guide
## Claude Code + Google Antigravity

Dit document beschrijft hoe je kunt werken met **zowel Claude Code als Google Antigravity** op hetzelfde project.

---

## Waarom Cross-Tool Development?

- **Rate limits**: Als je tegen Claude Code rate limits aanloopt, switch naar Antigravity
- **Beste van beide**: Claude Code voor architectuur, Antigravity voor snelle iteraties
- **Continuïteit**: Geen verlies van context of voortgang

---

## Setup

### 1. Shared Project Location

Werk ALTIJD in dezelfde directory:
```bash
cd ~/projects/vve-control
```

### 2. Context Files per Tool

Elke tool heeft zijn eigen context file:

```
~/projects/vve-control/
├── CLAUDE.md              # Voor Claude Code (primair)
├── .antigravity/
│   ├── context.md        # Voor Google Antigravity
│   └── rules.md          # Antigravity-specifieke rules
└── CROSS_TOOL_GUIDE.md   # Dit bestand
```

**Belangrijk**:
- Claude Code gebruikt `CLAUDE.md`
- Antigravity gebruikt `.antigravity/context.md`
- Houd beide synchroon na grote wijzigingen

### 3. Synchronisatie Strategie

#### Na significante wijzigingen in Claude Code:

```bash
# Update Antigravity context met nieuwe architectuur info
cat >> ~/.antigravity/context.md << 'EOF'

## Banking Module Update ($(date +%Y-%m-%d))

- Nieuwe hexagonal architectuur geïmplementeerd
- Zie ~/projects/vve-control/src/features/finance/banking/README.md
- Core business logic in BankingCore
- Providers: EnableBankingAdapter, MockBankingAdapter
- Repository: SupabaseRepository

Migration: 20260124_enhance_banking_schema.sql toegepast
Edge Function: Updated met association_id filtering

EOF
```

#### Na significante wijzigingen in Antigravity:

Open Claude Code en vraag:
> "Update CLAUDE.md met de laatste wijzigingen uit de Antigravity sessie. Ik heb [beschrijf wat je deed] toegevoegd/gewijzigd."

---

## Workflow Patterns

### Pattern 1: Architecture in Claude, Implementation in Antigravity

**Gebruik Claude Code voor**:
- Architectuur design
- Refactoring grote modules
- Database schema wijzigingen
- TypeScript interface design

**Gebruik Antigravity voor**:
- UI componenten bouwen
- Snelle bug fixes
- Styling/CSS aanpassingen
- Feature iteraties

**Handoff**:
```
Claude Code sessie eindigt met:
- README.md per module
- Interface definitions
- Migration SQL files

Antigravity sessie start met:
- Lees de README
- Implementeer UI bovenop interfaces
- Test en itereer snel
```

### Pattern 2: Parallel Development

Je kunt zelfs **beide tools parallel** gebruiken:

**Terminal 1** (Claude Code):
```bash
cd ~/projects/vve-control
# Werk aan backend/core logic
```

**Terminal 2** (Antigravity):
```bash
cd ~/projects/vve-control
# Werk aan UI/frontend
```

**Merge conflict voorkomen**:
- Claude: backend files (`src/features/*/core/`, `adapters/`, `ports/`)
- Antigravity: UI files (`src/features/*Page.tsx`, `components/`)

### Pattern 3: Switch on Rate Limit

Wanneer je een rate limit hit:

**In Claude Code**:
1. Vraag: "Write a handoff summary for Antigravity"
2. Kopieer de summary
3. Switch naar Antigravity

**In Antigravity**:
1. Plak de summary in de prompt
2. Vraag: "Continue from where Claude left off"
3. Werk verder

---

## Context Synchronisatie Checklist

### Dagelijks (Begin van sessie)

- [ ] Pull latest: `git pull origin main`
- [ ] Check welke tool laatst gebruikt werd
- [ ] Lees `CLAUDE.md` of `.antigravity/context.md`
- [ ] Check laatste commit message

### Na Grote Wijzigingen

- [ ] Update `CLAUDE.md` met nieuwe architectuur
- [ ] Update `.antigravity/context.md` met UI changes
- [ ] Commit: `git commit -m "docs: sync context after [wijziging]"`
- [ ] Push: `git push origin main`

### Voor Handoff Tussen Tools

**Van Claude naar Antigravity**:
```markdown
## Handoff Summary ($(date))

**Completed**:
- [X] Hexagonal banking architecture
- [X] Database migration 20260124
- [X] Edge Function association_id filtering

**Next Steps for Antigravity**:
1. Create BankConnectionWizard component (4 steps)
2. Update EnableBankingSandbox to use new BankingCore
3. Test multi-bank flow

**Key Files**:
- src/features/finance/banking/README.md
- src/features/finance/banking/core/BankingCore.ts
```

**Van Antigravity naar Claude**:
```markdown
## Handoff Summary ($(date))

**Completed**:
- [X] BankConnectionWizard UI (steps 1-3)
- [X] Updated EnableBankingSandbox
- [X] Styling improvements

**Issues for Claude**:
1. Type error in BankingCore.syncAccount() - needs fix
2. Consider adding retry logic for failed syncs
3. Auto-categorization rules need refinement

**Key Files**:
- src/features/finance/BankConnectionWizard.tsx
- src/features/finance/EnableBankingSandbox.tsx
```

---

## Git Workflow voor Cross-Tool

### Branch Strategy

**Optie 1: Feature branches per tool**
```bash
# Claude Code session
git checkout -b claude/banking-refactor

# Antigravity session
git checkout -b antigravity/wizard-ui

# Merge both when done
git checkout main
git merge claude/banking-refactor
git merge antigravity/wizard-ui
```

**Optie 2: Single main branch** (simpeler)
```bash
# Beide tools werken op main
# Commit vaak met duidelijke messages

# Claude Code commit:
git commit -m "refactor(banking): hexagonal architecture"

# Antigravity commit:
git commit -m "feat(ui): bank connection wizard"
```

### Commit Message Convention

Gebruik prefixes om te zien welke tool wat deed:

- `refactor(banking):` → Meestal Claude (architectuur)
- `feat(ui):` → Meestal Antigravity (interface)
- `fix:` → Beide
- `docs:` → Beide
- `chore:` → Beide

---

## Tool-Specific Tips

### Claude Code Strengths

✅ **Gebruik voor**:
- Database design & migrations
- TypeScript interfaces & types
- Hexagonal architecture
- RLS policies
- Edge Functions
- Complex refactoring

⚠️ **Vermijd voor**:
- Veel kleine UI tweaks
- CSS finetuning
- Trial-and-error styling

### Antigravity Strengths

✅ **Gebruik voor**:
- React component development
- UI/UX iteraties
- Tremor/Tailwind styling
- Form validation
- User flows
- Quick prototyping

⚠️ **Vermijd voor**:
- Large-scale refactoring
- Database schema changes
- Architectuur herziening

---

## Troubleshooting

### "Context is out of sync"

```bash
# Reset en sync
cd ~/projects/vve-control

# Lees laatste commits
git log --oneline -10

# Update je tool's context file
# Voor Claude:
cat CLAUDE.md

# Voor Antigravity:
cat .antigravity/context.md

# Vraag de tool: "Summarize recent changes in the codebase"
```

### "Merge conflict between tools"

```bash
# Check wat conflicted
git status

# Voor simpele conflicts:
git diff

# Resolve handmatig of:
git checkout --ours path/to/file    # Kies jouw versie
git checkout --theirs path/to/file  # Kies andere versie

# Commit merge
git add .
git commit -m "merge: resolve tool conflict"
```

### "I forgot which tool did what"

```bash
# Check commit history
git log --all --oneline --graph --decorate

# Check who edited file last
git log -1 --pretty=format:"%an - %ar - %s" path/to/file

# See file changes over time
git log -p path/to/file
```

---

## Best Practices Summary

1. **Eén source of truth**: Altijd `~/projects/vve-control`
2. **Commit vaak**: Na elke logische eenheid
3. **Duidelijke messages**: Prefix met module/type
4. **Context updates**: Bij grote wijzigingen beide MD files updaten
5. **Handoff summaries**: Bij tool switch altijd een summary
6. **Test na merge**: Als beide tools aan dezelfde feature werkten
7. **README per module**: Architectuur in README.md, niet alleen in context
8. **Types als contract**: TypeScript interfaces zijn het grensvlak tussen tools

---

## Quick Reference

| Vraag | Claude Code | Antigravity |
|-------|------------|-------------|
| Architectuur refactor? | ✅ | ❌ |
| Nieuwe UI component? | ⚠️ | ✅ |
| Database migration? | ✅ | ❌ |
| CSS tweaks? | ❌ | ✅ |
| TypeScript types? | ✅ | ⚠️ |
| Edge Function? | ✅ | ❌ |
| React hooks? | ⚠️ | ✅ |
| Bug fix? | ✅ | ✅ |
| RLS policy? | ✅ | ❌ |
| Form validation? | ⚠️ | ✅ |

Legend: ✅ Best choice | ⚠️ Can do | ❌ Avoid

---

## Context File Templates

### CLAUDE.md Template (Start van project)

```markdown
# Project Context for Claude Code

## Overview
[Beschrijving van project]

## Tech Stack
- Framework: [React/Next/etc]
- Database: [Supabase/PostgreSQL]
- etc.

## Architecture
[Hexagonal/MVC/etc]

## Key Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

## Current Focus
[Wat je nu aan het bouwen bent]

## Recent Changes
### YYYY-MM-DD
- [Change 1]
- [Change 2]
```

### .antigravity/context.md Template

```markdown
# Project Context for Google Antigravity

## Quick Start
[Hoe project te starten]

## Current UI State
[Beschrijving van UI zoals deze nu is]

## Component Structure
[Overzicht van belangrijke componenten]

## Styling Conventions
[Tremor/Tailwind patterns]

## Recent UI Changes
### YYYY-MM-DD
- [Change 1]
- [Change 2]
```

---

## Conclusie

Met deze guide kun je **naadloos schakelen** tussen Claude Code en Google Antigravity zonder context te verliezen. De key is:

1. **Shared directory** (`~/projects/vve-control`)
2. **Git als single source of truth**
3. **Context files per tool** (maar wel synchroon)
4. **Handoff summaries** bij elke switch
5. **Play to each tool's strengths**

Happy cross-tool development! 🚀
