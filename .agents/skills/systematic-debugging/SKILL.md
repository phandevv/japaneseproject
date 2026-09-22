---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior in NihongoCards, before proposing fixes
---

# Systematic Debugging for NihongoCards

## Overview

**Core principle:** ALWAYS find the root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Spring Boot test or build failures (`./mvnw.cmd test` / `./mvnw.cmd clean package`)
- Flyway database migration errors
- Dual-database divergence (H2 vs MySQL 8.0)
- Lucene search index out of sync
- HTTP 401/403 (JWT/CORS) or 429 (Bucket4j Rate Limit)
- Frontend React rendering, state, or Axios interceptor errors
- AWS EC2 / SSM Agent / Docker Compose deployment issues

---

## The Four Phases

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Stack Traces & Logs Carefully**
   - In Spring Boot: Inspect root `Caused by:` in the stack trace, check line numbers in `com.flashcard.*`.
   - In Flyway: Check `flyway_schema_history` and exact migration script name/version.
   - In React: Check browser console errors and Axios response interceptor logs.
2. **Reproduce Consistently**
   - Run the isolated test command in PowerShell:
     ```powershell
     ./mvnw.cmd test -Dtest=FailingTestClass#failingMethod
     ```
   - For API bugs, reproduce via `Invoke-RestMethod` or Postman/curl.
3. **Trace Across Component Boundaries**
   - Request path: `React Component` → `Axios Client` → `Nginx Proxy` → `SecurityFilter (JWT/Bucket4j)` → `Controller` → `Service` → `Repository` → `Database (H2/MySQL)` / `Lucene Index`.
   - Determine the exact layer where expected state diverges from actual state.

---

## NihongoCards Specific Diagnostic Playbooks

### Playbook 1: Flyway Migration Checksum Mismatch
- **Symptom**: `FlywayException: Validate failed: Migrations have failed validation: Migration checksum mismatch for migration version X`.
- **Root Cause**: An existing migration script (`V<n>__...sql`) was edited after being applied to the local H2 or remote MySQL database.
- **Remedy**:
  - NEVER edit applied migration files in production!
  - In local dev: run `./mvnw.cmd flyway:repair` or delete `./data/flashcard.mv.db` if using disposable local test data.
  - In production: create a new versioned migration `V<n+1>__fix_...sql`.

### Playbook 2: Dual-Database Divergence (H2 vs MySQL 8.0)
- **Symptom**: Code passes locally with H2 file DB, but fails with SQL syntax errors in Docker MySQL or AWS RDS.
- **Common causes**:
  - MySQL reserved keywords used as column names without backticks.
  - Date manipulation functions (e.g. `DATE_SUB` / `DATEADD` / `NOW()`).
  - Case sensitivity in table names (Linux EC2 MySQL is case-sensitive; Windows/H2 is not).
- **Remedy**:
  - Use JPQL / Spring Data query methods where possible.
  - Test complex queries against the local Docker MySQL container (`docker compose -f docker-compose.local.yml up db`).

### Playbook 3: Hibernate Search / Lucene Desynchronization
- **Symptom**: Vocabulary exists in the database but `/api/vocab/search?query=...` returns empty or stale results.
- **Root Cause**: Database was updated directly via SQL/Flyway without Lucene index updating, or indexing failed during application startup.
- **Remedy**:
  - Check `SearchIndexer.java` logs during Spring Boot startup.
  - Trigger manual reindex or ensure entities call `@Indexed` properly.

### Playbook 4: HTTP 429 Too Many Requests (Bucket4j)
- **Symptom**: Repeated requests to `/api/auth/login` or `/api/auth/register` fail with HTTP 429.
- **Root Cause**: Bucket4j rate limiting token bucket exhausted for the client IP.
- **Remedy**:
  - Verify if client IP extraction accounts for `X-Forwarded-For` behind Nginx reverse proxy.
  - For automated test suites, mock or bypass rate limiter beans or allow higher bucket capacities in test profile (`application-test.properties`).

### Playbook 5: JWT Token & CORS Authentication Errors
- **Symptom**: API calls return HTTP 401 or 403; frontend enters an infinite reload/logout loop.
- **Root Cause**:
  - Token expired or signature mismatch with `jwt.secret`.
  - CORS header `Access-Control-Allow-Origin` missing or mismatched (check `SecurityConfig.java` and `CORS_ORIGINS` env var: `http://localhost:5173` vs `https://phandeptrai.id.vn`).
  - Axios interceptor catching 401 and redirecting without clearing invalid localStorage token.

### Playbook 6: AWS SSM Agent / CI/CD Deployment Failure
- **Symptom**: GitLab CI/CD pipeline fails at `deploy_aws` stage or EC2 containers don't update.
- **Root Cause**:
  - AWS SSM Agent not online or IAM role missing `AmazonSSMManagedInstanceCore`.
  - Environment variable missing in EC2 `/home/ec2-user/app/.env` (e.g. `DEEPSEEK_API_KEY`).
  - Docker ECR login token expired on the EC2 host.

---

### Phase 2: Hypothesis Testing
- Formulate a single, falsifiable hypothesis.
- Add minimal diagnostic logging or run an isolated test.
- Confirm or discard before making any permanent code changes.

### Phase 3: Minimal Fix with TDD
- Write a failing test that reproduces the exact bug (see `superpowers:test-driven-development`).
- Implement the minimal fix:
  - **NO Lombok**: Keep all models pure Java.
  - **Preserve SM-2**: Never reset `is_learned` for score < 3.
  - Ensure `@Transactional` on write services.

### Phase 4: Verification & Regression Prevention
- Run the full test suite: `./mvnw.cmd test`.
- Run frontend build: `npm run build` in `frontend/`.
- Ensure no regressions were introduced.
