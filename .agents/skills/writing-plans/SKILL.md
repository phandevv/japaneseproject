---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task in NihongoCards, before touching code
---

# Writing Plans for NihongoCards

## Overview

Write comprehensive, bite-sized implementation plans. Assume the implementing developer understands software engineering, but needs explicit guidance on NihongoCards conventions:
- **Zero Lombok tolerance** (pure Java POJOs with standard getters/setters).
- **Dual-Database awareness** (Flyway migrations for both H2 and MySQL 8.0).
- **SRS algorithm integrity** (never clear `is_learned`).
- **Clean Spring Boot Layering** (Controller -> Service -> Repository).
- **Vanilla CSS styling** (Glassmorphism / Dark Mode, no Tailwind).
- **Mandatory documentation sync** (`SYSTEM_KNOWLEDGE.md` and `.ai/knowledge/`).

Save plans to: `docs/plans/YYYY-MM-DD-<feature-name>.md` or Antigravity's `implementation_plan.md` artifact.

---

## Task Granularity & Layering for NihongoCards

Structure implementation plans sequentially across the architecture:

### 1. Database & Migrations (if schema changes)
- Create Flyway migration: `backend/src/main/resources/db/migration/V<n>__<description>.sql`.
- Verify syntax works on both H2 and MySQL 8.0.

### 2. Entities & DTOs
- Create/modify JPA entities and DTOs using standard Java getters, setters, and constructors.
- **NEVER use Lombok** (`@Getter`, `@Setter`, `@Data`).
- Never return JPA Entities from Controllers — always define explicit Response DTOs.

### 3. Repositories
- Define Spring Data JPA repository interfaces and JPQL queries.
- Add `@DataJpaTest` tests where custom queries are introduced.

### 4. Service Layer (TDD)
- Write unit test in JUnit 5 + Mockito verifying business logic before writing service code.
- Annotate write/update methods with `@Transactional`.
- For SRS logic: verify `is_learned` is strictly preserved for quality < 3 if previously learned.
- Verification command: `./mvnw.cmd test -Dtest=MyServiceTest`.

### 5. Controller & API Layer (TDD)
- Write `@WebMvcTest` controller test with `MockMvc`.
- Use kebab-case endpoints (`/api/...`).
- Validate inputs with `@Valid`.

### 6. Frontend Components & Services
- Create UI components in `frontend/src/components/` with Vanilla CSS (Dark mode / Glassmorphism tokens).
- Add API calls in `frontend/src/services/api.js`.
- Verification command: `npm run build` or `npm test` in `frontend/`.

### 7. Documentation & Verification
- Update `SYSTEM_KNOWLEDGE.md` and `.ai/knowledge/<module>.md`.
- Run full `./mvnw.cmd test` and check `.ai/rules/09-review-checklist.md`.

---

## Plan Document Header

```markdown
# [Feature Name] Implementation Plan

> **Stack:** Java 21, Spring Boot 3.5.x, React 19, Flyway, H2/MySQL Dual-DB.
> **Iron Rules:** NO Lombok, preserve SM-2 is_learned, sync .ai/ docs.

**Goal:** [One sentence describing what this builds]
**Spec Reference:** [Link to spec or discussion]

---

### Task 1: [Flyway Migration / Schema]
- [ ] Step 1: Create `backend/src/main/resources/db/migration/V<n>__...sql`
- [ ] Step 2: Verify migration runs on H2 local

### Task 2: [Domain Model & Repository]
- [ ] Step 1: Write Entity POJO (pure Java getters/setters, NO Lombok)
- [ ] Step 2: Create Spring Data Repository interface

### Task 3: [Service Layer TDD]
- [ ] Step 1: Write failing unit test in `backend/src/test/java/...`
- [ ] Step 2: Run `./mvnw.cmd test -Dtest=...` to verify RED
- [ ] Step 3: Implement service with `@Transactional`
- [ ] Step 4: Run `./mvnw.cmd test -Dtest=...` to verify GREEN

### Task 4: [Controller & REST API]
- [ ] Step 1: Write MockMvc test for endpoint
- [ ] Step 2: Implement Controller with `@Valid` and DTO response

### Task 5: [Frontend UI & API Integration]
- [ ] Step 1: Add Axios client method in `services/api.js`
- [ ] Step 2: Build component with Vanilla CSS
- [ ] Step 3: Run `npm run build` to verify bundle

### Task 6: [Documentation Sync & Full Verification]
- [ ] Step 1: Update `.ai/knowledge/` and `SYSTEM_KNOWLEDGE.md`
- [ ] Step 2: Run `./mvnw.cmd test` and verify 10-point checklist
```
