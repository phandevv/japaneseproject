---
name: brainstorming
description: "You MUST use this before any creative work in NihongoCards - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs for NihongoCards

Turn ideas into fully formed designs and specs through natural collaborative dialogue grounded in NihongoCards architecture.

Start by classifying how much process the request needs, then work through your path: understand the context, refine the idea, present a design, and get your human partner's approval.

## NihongoCards Context & Architectural Constraints

Before proposing any design or approach, ground yourself in:
1. **[SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md)** and **[.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/)**.
2. **Architecture Decisions in [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/)**:
   - `0001-use-dual-database.md`: Dual database design (H2 for local, MySQL 8.0 for prod).
   - `0002-spaced-repetition-sm2.md`: SM-2 algorithm & preservation of `is_learned`.
   - `0003-ssm-agent-deployment.md`: Deployment via AWS SSM Agent on EC2.
   - `0004-activity-commit-style-grid.md`: 30-day activity commit-style grid.
3. **Frontend Aesthetic**: Vanilla CSS with Dark Mode and Glassmorphism design tokens (Lucide icons). No TailwindCSS.
4. **Backend Rules**: Java 21, Spring Boot 3.5.x, NO Lombok (plain getters/setters), clean layering, Flyway migrations.

## Establish Shared Understanding

1. **Discover intent.** Identify the intended outcome, who it is for, and what success looks like.
2. **Write back your understanding.** Summarize the intended outcome, constraints, and success criteria in chat.
3. **Carry intent into design.** Ground the design in NihongoCards existing modules (`user`, `vocabulary`, `srs`, `knowledge`, `analytics`).

<HARD-GATE>
Before taking any implementation action, including writing code, scaffolding, or running migrations, complete the selected path's prerequisites:
- Spike: human partner approves the question and probe.
- Bounded: human partner approves the short in-chat design.
- Architectural: human partner reviews and approves the written spec, then reviews the written implementation plan.
</HARD-GATE>

## Three Paths

Before your first question, classify the request and state it:
- **Spike** — Feasibility question ("can we...", "is it possible with Hibernate Search..."). 2-3 sentence probe plan, get approval, investigate, report findings.
- **Bounded** — Well-scoped change to existing code (a new vocabulary filter, a small SRS endpoint, a UI modal polish). Ask clarifying questions, present short in-chat design (files touched, testing), STOP and wait for approval.
- **Architectural** — New subsystem, major API restructuring, new payment or SRS algorithm variant. Follow full process: questions, 2-3 approaches with trade-offs, sectioned design, written spec document, then invoke `writing-plans`. If changing core architecture, include drafting an ADR for `.ai/decisions/`.

## Checklist

**Bounded:**
1. Explore project context (check files, `.ai/knowledge/`, recent commits).
2. Ask clarifying questions (one at a time).
3. Present short design in chat (approach, files touched, testing with `./mvnw.cmd test` or `npm test`).
4. Get approval — STOP and wait for explicit yes.
5. Implement via TDD.

**Architectural:**
1. Explore project context (`SYSTEM_KNOWLEDGE.md`, `.ai/knowledge/`, `.ai/decisions/`).
2. Ask clarifying questions (purpose, constraints, success criteria).
3. Propose 2-3 approaches with trade-offs and recommendation.
4. Present design in sections, get user approval after each.
5. Write design spec doc (save to `docs/specs/YYYY-MM-DD-<topic>-design.md` or `.ai/decisions/`).
6. Spec self-review (placeholder scan, consistency, no Lombok check, Flyway migration plan).
7. User reviews written spec.
8. Transition to implementation: invoke `superpowers:writing-plans`.
