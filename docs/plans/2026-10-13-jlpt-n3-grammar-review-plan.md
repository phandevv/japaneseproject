# JLPT N3 Grammar Review (Tổng Ôn Ngữ Pháp) Implementation Plan

> **Stack:** Java 21, Spring Boot 3.5.x, React 19, Flyway, H2/MySQL Dual-DB, MongoDB (optional).
> **Iron Rules:** NO Lombok, preserve SM-2 is_learned, sync .ai/ docs.

**Goal:** Add a "Tổng Ôn Ngữ Pháp" section below Chapter 9 Lesson 3 on the JLPT N3 practice page that groups ~244 existing grammar patterns into ~25-35 themed clusters (~10/group), each with a detail view (intro, usage guide, usage cases, 3 examples per pattern) and 30 multiple-choice questions. Supports admin AI generation and JSON file import.

**Spec Reference:** `.ai/decisions/0005-jlpt-n3-grammar-review.md`

---

## Phần 1: Backend — Database & Migrations

### Task 1: Flyway Migration V32 — Create `jlpt_n3_grammar_groups` table
- [ ] Create `backend/src/main/resources/db/migration/V32__create_jlpt_n3_grammar_groups_table.sql`
  - Columns: id (BIGINT PK), group_code (VARCHAR 100 UNIQUE), title, description (TEXT), usage_guide (TEXT), usage_cases (TEXT), grammar_pattern_ids (TEXT/JSON), example_sentences_json (TEXT/JSON), sort_order (INT), total_patterns (INT), created_at, updated_at
  - Must work on both H2 and MySQL 8.0

### Task 2: Flyway Migration V33 — Extend `jlpt_n3_grammar_quizzes` table
- [ ] Create `backend/src/main/resources/db/migration/V33__add_grammar_group_fields_to_quiz.sql`
  - Add columns: group_id (BIGNULL), group_code (VARCHAR 100), question_type (VARCHAR 50 DEFAULT 'MCQ')
  - All nullable for backward compatibility

### Task 3: Extend `jlpt_n3_progress` table (V34 if needed)
- [ ] Add columns: grammar_review_passed (BOOLEAN), grammar_review_score (INT), grammar_review_best_score (INT)
  - Or reuse existing quiz fields — verify with existing schema

---

## Phần 2: Backend — Models & Repositories

### Task 4: Create `JlptN3GrammarGroup.java` Entity
- [ ] `backend/src/main/java/com/flashcard/knowledge/model/JlptN3GrammarGroup.java`
  - Pure Java getters/setters, NO Lombok
  - Fields: id, groupCode, title, description, usageGuide, usageCases, grammarPatternIds (JSON string), exampleSentencesJson, sortOrder, totalPatterns, createdAt, updatedAt

### Task 5: Extend `JlptN3GrammarQuiz.java`
- [ ] Add fields: groupId (Long), groupCode (String), questionType (enum: MCQ, FILL_BLANK, CHOOSE_PATTERN)
  - Update constructors and getters/setters

### Task 6: Create `JlptN3GrammarGroupRepository.java`
- [ ] `backend/src/main/java/com/flashcard/knowledge/repository/JlptN3GrammarGroupRepository.java`
  - Extends JpaRepository<JlptN3GrammarGroup, Long>
  - Methods: findAllByOrderBySortOrder(), findByGroupCode(String)

### Task 7: Extend `JlptN3DataProvider.java` interface
- [ ] Add methods:
  - `List<JlptN3GrammarGroup> findAllGrammarGroups()`
  - `Optional<JlptN3GrammarGroup> findGrammarGroupByCode(String groupCode)`
  - `JlptN3GrammarGroup saveGrammarGroup(JlptN3GrammarGroup group)`
  - `List<Map<String, Object>> findQuizzesByGroupCode(String groupCode)`

### Task 8: Implement provider methods in `JlptN3JpaDataProvider.java` and `JlptN3MongoDataProvider.java`
- [ ] Add JPA implementation
- [ ] Add Mongo implementation (with `@ConditionalOnProperty`)

---

## Phần 3: Backend — Service Layer (TDD)

### Task 9: Write `JlptN3GrammarReviewServiceTest.java` (RED phase)
- [ ] `backend/src/test/java/com/flashcard/knowledge/service/JlptN3GrammarReviewServiceTest.java`
  - Test: getGrammarGroupOverview() returns list of groups
  - Test: getGrammarGroupDetail(code) returns group + questions
  - Test: importGrammarGroupData() validates and persists
  - Test: submitGroupQuiz() updates progress

### Task 10: Run test to verify RED
- [ ] `./mvnw.cmd test -Dtest=JlptN3GrammarReviewServiceTest` → should fail

### Task 11: Implement `JlptN3GrammarReviewService.java` (GREEN phase)
- [ ] `backend/src/main/java/com/flashcard/knowledge/service/JlptN3GrammarReviewService.java`
  - `getGrammarGroupOverview(userId)`: returns all groups + progress
  - `getGrammarGroupDetail(groupCode, userId)`: returns group + questions + coverage
  - `importGrammarGroupData(files)`: parse JSON, batch save
  - `submitGroupQuiz(userId, groupCode, score, total)`: update progress
  - `buildGrammarGroupsFromAi()`: AI-powered clustering (calls DeepSeekEnrichmentService)

### Task 12: Run test to verify GREEN
- [ ] `./mvnw.cmd test -Dtest=JlptN3GrammarReviewServiceTest` → should pass

---

## Phần 4: Backend — Controller & API (TDD)

### Task 13: Write `JlptN3GrammarReviewControllerTest.java`
- [ ] `backend/src/test/java/com/flashcard/knowledge/controller/JlptN3GrammarReviewControllerTest.java`
  - Test GET /api/jlpt-n3/grammar-review
  - Test GET /api/jlpt-n3/grammar-review/group/{code}
  - Test POST /api/jlpt-n3/grammar-review/import
  - Test POST /api/jlpt-n3/grammar-review/submit

### Task 14: Implement `JlptN3GrammarReviewController.java`
- [ ] `backend/src/main/java/com/flashcard/knowledge/controller/JlptN3GrammarReviewController.java`
  - Endpoints:
    - GET `/api/jlpt-n3/grammar-review` → overview
    - GET `/api/jlpt-n3/grammar-review/group/{code}` → detail
    - POST `/api/jlpt-n3/grammar-review/generate` → admin AI generate
    - POST `/api/jlpt-n3/grammar-review/import` → admin JSON import
    - PUT `/api/jlpt-n3/grammar-review/group/{code}` → admin edit
    - POST `/api/jlpt-n3/grammar-review/submit` → submit quiz

### Task 15: Run controller test
- [ ] `./mvnw.cmd test -Dtest=JlptN3GrammarReviewControllerTest`

---

## Phần 5: Backend — AI Enrichment Integration

### Task 16: Add AI methods to `DeepSeekEnrichmentService.java`
- [ ] `clusterGrammarPatterns(List<GrammarCard>)`: AI clusters patterns into groups
- [ ] `generateGrammarGroupDetail(groupCode, patterns)`: generates intro, usage_guide, usage_cases
- [ ] `generateGrammarGroupQuestions(groupCode, patterns)`: generates 30 questions (mix of MCQ/CHOOSE_PATTERN/FILL_BLANK)

### Task 17: Add MongoDB document for grammar groups
- [ ] `backend/src/main/java/com/flashcard/knowledge/document/JlptN3GrammarGroupDoc.java`
  - Mirror of entity for Mongo storage

---

## Phần 6: Frontend — API & Components

### Task 18: Add API methods to `frontend/src/services/api.js`
- [ ] Add `jlptN3GrammarReviewApi`:
  - `getOverview()`
  - `getGroup(groupCode)`
  - `generateAll()` (admin)
  - `importData(jsonData)` (admin)
  - `submitQuiz(groupCode, score, total)`

### Task 19: Create `GrammarReviewSection.jsx` component
- [ ] `frontend/src/components/GrammarReviewSection.jsx`
  - Overview grid: cards for each group (title, pattern count, progress badge)
  - Group detail modal: 2-pane (left: intro + 10 patterns with examples; right: 30 questions)
  - Question types: MCQ (4 options), FILL_BLANK (text input), CHOOSE_PATTERN (select from list)
  - Submit button → POST /grammar-review/submit

### Task 20: Integrate into `JlptN3Page.jsx`
- [ ] Import and render `<GrammarReviewSection />` below Chapter 9 Lesson 3 content
- [ ] Show expansion transition when user completes Chapter 9 Lesson 3 or scrolls to bottom

### Task 21: Run frontend build
- [ ] `cd frontend && npm run build`

---

## Phần 7: MongoDB Migrations & Documents

### Task 22: Create Mongo document for grammar groups
- [ ] `JlptN3GrammarGroupDoc.java` (if MongoDB mode)
- [ ] Extend `JlptN3GrammarQuizDoc.java` with groupId, groupCode, questionType fields

### Task 23: Extend Mongo repositories
- [ ] `JlptN3GrammarGroupMongoRepository.java`
- [ ] Extend `JlptN3GrammarQuizMongoRepository.java`

---

## Phần 8: Documentation Sync & Full Verification

### Task 24: Update documentation
- [ ] Update `SYSTEM_KNOWLEDGE.md` — add Grammar Review API endpoints to section 8
- [ ] Update `.ai/knowledge/business-modules.md` — add section 8: Grammar Review module
- [ ] Update `.ai/knowledge/database.md` — add new tables & collections
- [ ] Update `.ai/knowledge/api.md` — add new endpoints

### Task 25: Run full test suite
- [ ] `./mvnw.cmd test` — all backend tests pass
- [ ] Check `.ai/rules/09-review-checklist.md` 10-point checklist

### Task 26: Final verification
- [ ] Verify dual-database compatibility (H2 + MySQL queries)
- [ ] Verify no Lombok usage
- [ ] Verify all new entities have proper getters/setters
- [ ] Verify frontend builds successfully
