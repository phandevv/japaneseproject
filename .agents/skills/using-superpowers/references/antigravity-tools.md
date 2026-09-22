# Antigravity (`agy` / Antigravity IDE) Tool Mapping for NihongoCards

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file", "run verification"). In the Antigravity IDE on Windows PowerShell for **NihongoCards**, these resolve to the tools below:

| Action in Skills | Antigravity Equivalent | Notes for NihongoCards |
|---|---|---|
| Run tests / commands | `run_command` (PowerShell) | Backend: `./mvnw.cmd test -Dtest=...`<br>Frontend: `npm test` or `npm run build` |
| File view / inspection | `view_file` / `grep_search` | Read source, check line numbers (up to 800 lines/call) |
| File edit | `replace_file_content` / `multi_replace_file_content` | Single or multiple contiguous blocks |
| File create | `write_to_file` | Creates file and missing parent directories |
| Task tracking / Todo | Task Artifact (`implementation_plan.md` / markdown checklist) | Antigravity has no `todo` tool. Use artifacts with `- [ ]` and `- [x]`. |
| Subagent dispatch | `invoke_subagent` | `TypeName`: `self` (full capabilities) or `research` (read-only) |
| UI testing / Verification | `browser_subagent` | Interactive browser testing for React web frontend |
| Background jobs | `manage_task` | Used for process management (run dev server, etc.) |

## Task Tracking in Antigravity
When a skill specifies creating a todo list or tracking task progress:
1. Maintain the task checklist in the task artifact (`implementation_plan.md` or a markdown checklist in the artifacts directory).
2. As each step is completed, update the checklist using `replace_file_content` from `- [ ]` to `- [x]`.
3. Keep the checklist strictly updated as your single source of truth.
