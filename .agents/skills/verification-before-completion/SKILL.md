---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs in NihongoCards - requires running fresh verification commands and confirming output against the project checklist
---

# Verification Before Completion for NihongoCards

## Overview

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message or session, you cannot claim it passes.

---

## Verification Command Matrix (Run in PowerShell)

| Component | Fresh Verification Command | Required Output |
|---|---|---|
| **Backend Build** | `./mvnw.cmd clean package -DskipTests` | `BUILD SUCCESS` (Exit code 0) |
| **Backend Tests** | `./mvnw.cmd test` | `0 failures, 0 errors` |
| **Frontend Build** | `cd frontend; npm run build` | `✓ built in ...` (Exit code 0) |
| **Frontend Tests** | `cd frontend; npm test` (if configured) | All tests pass |

---

## Mandatory 10-Point Pre-Review Checklist (.ai/rules/09-review-checklist.md)

Before claiming any task is done or ready for review, you must verify all 10 points:

### 1. Build & Compile
- [ ] **Backend Compilation**: `./mvnw.cmd clean package -DskipTests` succeeds without compilation errors.
- [ ] **Backend Automated Tests**: `./mvnw.cmd test` passes 100% (zero failures, zero errors).
- [ ] **Frontend Production Build**: `npm run build` in `frontend/` succeeds with no bundle or syntax errors.

### 2. Database & API Design
- [ ] **Flyway Migration**: Any DB schema change has a corresponding `V<n>__<name>.sql` script and is compatible with both H2 and MySQL.
- [ ] **API Endpoint Convention**: Endpoints use `kebab-case`, validate input via `@Valid`, and use DTOs (never return JPA Entities directly).
- [ ] **Transaction Management**: All write/update service methods are annotated with `@Transactional`.

### 3. Architecture & Security Invariants
- [ ] **NO Lombok**: Verify with grep that no `@Getter`, `@Setter`, `@Data`, or `import lombok.*` exist in the codebase.
- [ ] **SRS / SM-2 Preservation**: Verify that `is_learned` status is preserved when review quality is < 3 for already learned words.
- [ ] **Security**: Passwords encrypted with BCrypt; no hardcoded API keys/passwords/tokens; sensitive routes protected by Bucket4j rate limiter.
- [ ] **Frontend Styling**: Vanilla CSS conforms to Dark Mode & Glassmorphism design tokens (no Tailwind classes).

### 4. Documentation Synchronization
- [ ] **System Knowledge**: [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) updated if architecture or business rules were touched.
- [ ] **AI Knowledge Base**: Related documents in [.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/) updated to reflect active code.
- [ ] **Architecture Decisions**: New ADR added to [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/) if a major architectural choice was made.

---

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command or checklist item proves this claim?
2. RUN: Execute the FULL command fresh in PowerShell (e.g. ./mvnw.cmd test).
3. READ: Full output, check exit code, count failures.
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence and diagnose.
   - If YES: State claim WITH evidence.
5. ONLY THEN: Make the completion claim.

Skip any step = lying, not verifying.
```

## Red Flags - STOP

- Using "should", "probably", "seems to work"
- Expressing satisfaction before verification ("Great!", "Done!", "Fixed!")
- Trusting subagent success reports without checking git diff
- Not running `./mvnw.cmd test` or `npm run build`
- Claiming tests pass because they passed in a previous turn
