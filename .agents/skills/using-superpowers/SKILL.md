---
name: using-superpowers
description: Use when starting any conversation or task - establishes how to find and use skills, requiring skill invocation before ANY response or code modification in NihongoCards
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## NihongoCards Project Invariants (Mandatory)

Before performing any action in this repository, you must respect these non-negotiable project rules:
1. **Initial Knowledge Review**:
   - Read [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) for overall architecture.
   - Review relevant files in [.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/) for business modules, DB schema, and APIs.
   - Strictly follow [.ai/rules/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/) (especially `00-system-rule.md`, `01-backend-rule.md`, `02-frontend-rule.md`, `09-review-checklist.md`).
   - Consult ADRs in [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/).
2. **Ironclad Technical Rules**:
   - 🚫 **NO Lombok**: Never use `@Getter`, `@Setter`, `@Data`, or any Lombok annotations. Always write or generate standard Java getters, setters, and constructors.
   - 🧠 **Preserve Learned SRS Words**: Never modify the SM-2 algorithm or SRS logic to clear `is_learned` for words that were previously mastered (rating >= 3).
   - 📝 **Documentation Synchronization**: Synchronize `.ai/knowledge/`, `.ai/rules/`, and `SYSTEM_KNOWLEDGE.md` whenever code or architecture changes.
   - 🗄️ **Dual Database Compatibility**: Ensure queries and Flyway migrations work seamlessly across local H2 file database and production MySQL 8.0 on AWS RDS.

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode:** if you haven't already brainstormed, invoke the `brainstorming` skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. Maintain a task artifact checklist for multi-step tasks.

## Skill Priority for NihongoCards

When multiple skills apply, process skills come first:
- **"Build feature X" / "Create component Y"** → `superpowers:brainstorming` first, then `superpowers:writing-plans`, then implementation.
- **"Fix this bug" / "Test failed" / "500 Internal Error"** → `superpowers:systematic-debugging` first, then TDD.
- **Writing any code or feature** → `superpowers:test-driven-development` (RED-GREEN-REFACTOR with `./mvnw.cmd test` or `npm test`).
- **Before claiming done or ready to commit** → `superpowers:verification-before-completion` (Run full `./mvnw.cmd test`, `npm run build`, and check `.ai/rules/09-review-checklist.md`).
- **Before merging or completing major task** → `superpowers:requesting-code-review`.

## Platform Adaptation (Antigravity & Windows)

In this workspace, Antigravity IDE and Windows PowerShell are the primary environment:
- Read `references/antigravity-tools.md` for tool mappings.
- Test commands run via PowerShell: `./mvnw.cmd test` (Backend), `npm test` (Frontend).
- File editing tools: `replace_file_content`, `multi_replace_file_content`, `write_to_file`.
- Task tracking: Task artifacts (`implementation_plan.md`, checklists).
- Subagents: `invoke_subagent`.

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I'll just add Lombok annotations" | FORBIDDEN by project rules. Pure Java getters/setters only. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll test after writing the code" | Violates TDD Iron Law. Test first, watch it fail. |
| "Verification command takes too long" | Verification is mandatory before any completion claim. |
