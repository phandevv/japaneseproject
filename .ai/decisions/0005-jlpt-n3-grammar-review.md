# ADR-0005: JLPT N3 Grammar Review (Tổng Ôn Ngữ Pháp) Feature

## Status
Proposed

## Context
The JLPT N3 practice page (`JlptN3Page.jsx`) currently supports 9 chapters × 3 lessons = 27 lesson blocks, each containing kanji, vocabulary, grammar patterns, and quizzes. Users study grammar per-lesson but lack a consolidated **grammar review/summary** section that groups related grammar patterns together for holistic revision.

There are **244 grammar patterns** across 41 JSON files in `data/tổng ôn N3/data/`. The existing `jlpt_n3_grammar_quizzes` table stores 30-question AI-generated grammar MCQ quizzes per lesson. The project uses dual-database (H2 local + MySQL prod) with optional MongoDB for JLPT N3 data.

## Decision
Add a new **"Tổng Ôn Ngữ Pháp"** section below Chapter 9 Lesson 3 on the `JlptN3Page.jsx`, featuring:

1. **Grammar Groups**: AI-clustering existing grammar patterns into ~10-pattern groups based on semantic/functional similarity.
2. **Group Detail View**: Introduction, usage guide, usage cases, and per-pattern meaning for each group.
3. **Practice Questions**: 30 multiple-choice questions per group (choose pattern, fill-in-the-blank types).
4. **Example Sentences**: ~3 per grammar pattern.
5. **Data Import API**: Upload grouped data via API with completion notification.

## Architecture

### New Tables (Flyway Migrations)

#### V32: `jlpt_n3_grammar_groups`
```sql
CREATE TABLE jlpt_n3_grammar_groups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_code VARCHAR(100) NOT NULL UNIQUE,   -- e.g., "GRAMMAR_GROUP_01"
  title VARCHAR(255) NOT NULL,                -- e.g., "Nhóm 1: Cấu trúc ~ば~ほど và các biến thái"
  description TEXT,                           -- Introduction / overview
  usage_guide TEXT,                           -- How to use this group's patterns
  usage_cases TEXT,                           -- Usage scenarios
  grammar_pattern_ids TEXT,                   -- JSON array of GrammarCard IDs belonging to this group
  example_sentences_json TEXT,                -- JSON: { "pattern": ["sentence1", "sentence2", "sentence3"] }
  sort_order INT DEFAULT 0,
  total_patterns INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);
```

#### V33: `jlpt_n3_grammar_group_quizzes`
Extend existing `jlpt_n3_grammar_quizzes` table instead of creating new:
```sql
ALTER TABLE jlpt_n3_grammar_quizzes
ADD COLUMN group_id BIGINT NULL COMMENT 'FK to jlpt_n3_grammar_groups; if set, belongs to grammar review group',
ADD COLUMN group_code VARCHAR(100) NULL COMMENT 'Denormalized group code for fast lookup',
ADD COLUMN question_type VARCHAR(50) DEFAULT 'MCQ' COMMENT 'MCQ, FILL_BLANK, CHOOSE_PATTERN';
```

### MongoDB Collections (when `app.database.type=mongodb`)
- `jlpt_n3_grammar_groups` collection — same schema as SQL table
- `jlpt_n3_grammar_quizzes` — extended with `groupId`, `groupCode`, `questionType` fields

### Backend Changes

#### New Model: `JlptN3GrammarGroup.java`
```java
@Entity
@Table(name = "jlpt_n3_grammar_groups")
public class JlptN3GrammarGroup {
    // id, groupCode, title, description, usageGuide, usageCases
    // grammarPatternIds (JSON string), exampleSentencesJson (JSON string)
    // sortOrder, totalPatterns, createdAt, updatedAt
}
```

#### Extended Model: `JlptN3GrammarQuiz.java`
Add fields: `groupId`, `groupCode`, `questionType` (enum: `MCQ`, `FILL_BLANK`, `CHOOSE_PATTERN`).

#### New Repository: `JlptN3GrammarGroupRepository.java`
- `List<JlptN3GrammarGroup> findAllByOrderBySortOrder()`
- `Optional<JlptN3GrammarGroup> findByGroupCode(String groupCode)`
- Mongo equivalent with `@Document` mapping

#### Extended Provider: `JlptN3DataProvider.java`
```java
// Grammar Group methods
List<JlptN3GrammarGroup> findAllGrammarGroups();
Optional<JlptN3GrammarGroup> findGrammarGroupByCode(String groupCode);
JlptN3GrammarGroup saveGrammarGroup(JlptN3GrammarGroup group);

// Extended Quiz methods
List<Map<String, Object>> findQuizzesByGroupId(Long groupId);
List<Map<String, Object>> findQuizzesByGroupCode(String groupCode);
```

#### New Service: `JlptN3GrammarReviewService.java`
- `buildGrammarGroups()`: AI-powered clustering of existing GrammarCard patterns into groups
- `generateGroupQuestions(group)`: Creates 30 questions per group (mix of MCQ, fill-blank, choose-pattern)
- `importGrammarGroupData()`: Accept uploaded JSON, persist groups + quizzes atomically
- `getGrammarGroupOverview()`: Return all groups with progress info
- `getGrammarGroupDetail(groupCode)`: Return group + its 30 questions

#### Extended Controller: `JlptN3CourseController.java`
New endpoints:
```
GET  /api/jlpt-n3/grammar-review             → Overview of all grammar groups + progress
GET  /api/jlpt-n3/grammar-review/group/{code}  → Detail of one group + 30 questions
POST /api/jlpt-n3/grammar-review/generate      → Admin: AI generate all groups (async)
POST /api/jlpt-n3/grammar-review/import        → Admin: import grouped JSON data
PUT  /api/jlpt-n3/grammar-review/group/{code}  → Admin: update group detail
POST /api/jlpt-n3/grammar-review/submit        → Submit group quiz scores
```

### Frontend Changes

#### Modified: `JlptN3Page.jsx`
Add a new section below the Chapter 9 Lesson 3 lesson view. When user scrolls to or completes Chapter 9 Lesson 3, show a "Tổng Ôn Ngữ Pháp" expansion panel.

#### New Component: `GrammarReviewSection.jsx`
- Overview grid of all grammar groups (collapsible cards with title, pattern count, progress badge)
- Detail modal with two-pane view:
  - Left: Group introduction, usage guide, usage cases, list of ~10 patterns each with 3 example sentences
  - Right: 30-question quiz (MCQ, fill-blank, choose-pattern) with answer checking

#### Modified: `api.js`
Add `jlptN3GrammarReviewApi` with:
- `getOverview()`
- `getGroup(groupCode)`
- `generateAll()` (admin)
- `importData(jsonData)` (admin)
- `submitQuiz(groupCode, score, total)`

### Data Flow

```
1. AI GROUPING PIPELINE (admin triggers /api/jlpt-n3/grammar-review/generate):
   All GrammarCard patterns from DB
   → DeepSeekEnrichmentService.clusterGrammarPatterns()
   → Groups of ~10 similar patterns (by meaning + usage)
   → For each group: DeepSeekEnrichmentService.generateGrammarGroupDetail(group)
   → 2-step per group: (a) intro/guide/cases, (b) 30 questions
   → Save to jlpt_n3_grammar_groups + jlpt_n3_grammar_quizzes (groupId set)

2. MANUAL JSON IMPORT (admin uploads via frontend):
   Upload JSON file(s) → POST /api/jlpt-n3/grammar-review/import
   → JlptN3GrammarReviewService.importGrammarGroupData(files)
   → Validate schema → Batch persist in transaction
   → Return { success, groupsCount, questionsCount, details[] }

3. USER VIEW:
   GET /api/jlpt-n3/grammar-review → List of groups + progress
   GET /api/jlpt-n3/grammar-review/group/{code} → Group detail + 30 questions
   POST /api/jlpt-n3/grammar-review/submit → Save progress to jlpt_n3_progress
```

### JSON Schema for Imported Grammar Group Data

```jsonc
{
  "groups": [
    {
      "group_code": "GRP_01",
      "title": "Nhóm 1: Diễn đạt 'Càng... càng...' và các dạng liên quan",
      "description": "Giới thiệu nhóm ngữ pháp...",
      "usage_guide": "Cách dùng: dùng để so sánh, nhấn mạnh mứ độ...",
      "usage_cases": "Trường hợp dùng: so sánh hai tình huống, nhấn mạnh quan hệ nhân quả...",
      "patterns": [
        {
          "cau_truc": "〜ば〜ほど",
          "y_nghia": "Càng... càng...",
          "examples": [
            "男性は背が高ければ高いほど人気がある。",
            "あの人のことを知れば知るほど好きになる。",
            "日本語が上手であればあるほど、日本の会社で働きやすくなる。"
          ]
        },
        ...  // ~10 patterns total
      ],
      "questions": [
        {
          "id": 1,
          "type": "CHOOSE_PATTERN",
          "question": "Câu nào dùng đúng cấu trúc 〜ば〜ほど?",
          "options": ["〜ば〜ほど", "〜ように", "〜たび", "〜ている"],
          "answer": 1,
          "explanation": "..."
        },
        {
          "id": 2,
          "type": "FILL_BLANK",
          "question": "Nếu... (high/rare) thì... càng nhiều: 背が高ければ（ ）なる。",
          "answer": "人気",
          "explanation": "..."
        },
        ...  // 30 questions total
      ]
    },
    ...  // 25-35 groups total
  ]
}
```

### Database Compatibility
- Flyway migrations must work on both H2 (local dev) and MySQL 8.0 (production)
- MongoDB schema mirrors SQL structure with same field names
- `questionsJson` stored as LONGTEXT (MySQL) / TEXT (H2) for SQL, native JSON for Mongo
- All queries must work on both database types

### Progress Tracking
- Progress stored in existing `jlpt_n3_progress` table
- New columns: `grammar_review_passed`, `grammar_review_score`, `grammar_review_best_score`
- Lesson completion now requires 6 components (was 5): vocab, kanji, grammar, quiz, reading, **grammar_review**

## Consequences
- **Positive**: Holistic grammar review improves retention; 244 patterns become manageable in 25-35 themed groups; 30-question drills reinforce learning
- **Negative**: AI generation cost (35 groups × 2 calls = 70 AI calls); ~30 new migration fields across tables
- **Migration complexity**: Dual DB (SQL+Mongo) requires careful provider layer handling
- **Backward compatibility**: Existing lesson quizzes unaffected; new fields are nullable
