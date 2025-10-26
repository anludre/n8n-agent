# n8n Auth + Roles (Playwright MCP)

Минимальный репозиторий для авторизации в n8n через Playwright MCP и набор ролей автоматизации. Хранит артефакты авторизации (`auth/state.json`), pinned MCP‑сервер и спецификации ролей в каталоге `roles/`.

### Структура
```
auth/
  ├─ login.js
  ├─ refresh_state.sh
  └─ state.json
roles/
  ├─ orchestrator.md
  ├─ controller.md
  ├─ developer.md
  ├─ explorer.md
  ├─ manager.md
  └─ qa.md
.nvmrc
package.json
README.md
```

### Переменные окружения
- N8N_URL — базовый URL инстанса n8n (например, https://your-n8n.example)
- N8N_USERNAME или N8N_EMAIL — логин (email)
- N8N_PASSWORD или N8N_PASS — пароль

### Готовые скрипты (без написания новых)
- `npm run auth:demo` — вход в видимом браузере (slow-mo), сохранение `auth/state.json`
- `npm run -s auth:check` — проверка, что текущие cookie валидны (OK/NEEDS_LOGIN/UNKNOWN)
- `npm run auth:refresh` — обновить `auth/state.json` через автологин по переменным окружения
- `npm run mcp:start` — запустить локально установленный MCP‑сервер Playwright (`mcp-server-playwright`) с `--storage-state=auth/state.json`

MCP‑сервер зафиксирован в `devDependencies` (`@playwright/mcp`), для повторяемости окружений не используется `npx ...@latest`.

### Требования
- Node.js `>=18.18 <23` (см. `engines` и `.nvmrc`)

### Быстрый старт
0) Выберите версию Node:
```bash
nvm use # возьмёт версию из .nvmrc
```
1) Установите зависимости (браузеры Playwright установятся автоматически через postinstall):
```bash
npm install
```
2) Подготовьте переменные (через `.env` или экспорт):
```bash
export N8N_URL="https://your-n8n.example"
export N8N_USERNAME="your_email@example.com" # или N8N_EMAIL
export N8N_PASSWORD="your_password"          # или N8N_PASS
```
3) Войти и увидеть процесс в браузере:
```bash
npm run auth:demo
```
4) Проверить авторизацию:
```bash
npm run -s auth:check
```
5) Запустить MCP‑сервер с сохраненным состоянием:
```bash
npm run mcp:start
```

Если cookie валидны, последующие действия в n8n выполняются без повторного логина.

### Параметры демо (опционально)
- `HEADLESS=false` — показать окно браузера
- `DEMO=1` — включить демо режим (замедление шагов)
- `SLOWMO=350` — задержка между действиями в мс
 
- `DEMO_PAUSE_MS=5000` — пауза после входа, чтобы осмотреть UI
- `STATE_PATH` — путь для сохранения `storageState` (по умолчанию `auth/state.json`)

### Коды выхода
auth:check (auth/check_auth.js):

| Код | Значение |
|---|---|
| 0 | OK: авторизовано |
| 2 | NEEDS_LOGIN: обнаружена форма логина |
| 3 | UNKNOWN: не удалось подтвердить состояние |
| 1 | ERROR: непредвидённая ошибка |

auth:refresh / auth:demo (auth/login.js):

| Код | Значение |
|---|---|
| 0 | Успешный логин и сохранение state |
| 1 | Отсутствует N8N_URL |
| 2 | Отсутствуют креденшелы (email/пароль) |
| 10 | Не удалось залогиниться после ретраев |

### Артефакты
- `reports/explore/` — JSON инвентаризации (`inventory.json`), скриншоты `*.png`
- `reports/qa/` — верификационные отчёты (`report.json`), скриншоты `*.png`
- `reports/control/` — планы действий контроллера (`plan.json`, `status.json`)
- `reports/developer/` — журналы исполнения (`execution.jsonl`, `summary.json`)
- `reports/manager/` — операционные логи (`operations.jsonl`)

Опционально: при `TRACE=1` можно сохранять дополнительные трассы/скриншоты в соответствующие каталоги.

### Схемы артефактов (JSON Schema)
| Роль | Артефакт | Путь | Схема |
|---|---|---|---|
| Explorer | Inventory | `reports/explore/inventory.json` | `schemas/explore.inventory.schema.json` |
| Controller | Plan | `reports/control/plan.json` | `schemas/control.plan.schema.json` |
| Developer | Execution Log (JSONL item) | `reports/developer/execution.jsonl` | `schemas/developer.execution.schema.json` |
| QA | Report | `reports/qa/report.json` | `schemas/qa.report.schema.json` |
| Manager | Operations Log (JSONL item) | `reports/manager/operations.jsonl` | `schemas/manager.operations.schema.json` |

Запуск валидации последних артефактов:
```bash
npm run validate:artifacts
```

Минимальные примеры
```json
// reports/explore/inventory.json
{ "version": "1", "generatedAt": "2025-01-01T00:00:00Z", "items": [] }
```
```json
// reports/control/plan.json
{ "version": "1", "generatedAt": "2025-01-01T00:00:00Z", "status": "PLAN", "actions": [] }
```
```json
// reports/qa/report.json
{ "version": "1", "generatedAt": "2025-01-01T00:00:00Z", "result": "PASSED", "artifacts": [], "checks": [] }
```
```json
// reports/developer/execution.jsonl (одна строка)
{ "timestamp": "2025-01-01T00:00:00Z", "actionId": "a1", "status": "DONE" }
```
```json
// reports/manager/operations.jsonl (одна строка)
{ "timestamp": "2025-01-01T00:00:00Z", "operation": "RENAME", "target": "Workflow A" }
```

### Ограничения
- SSO/2FA не поддерживаются из коробки; могут потребовать кастомных шагов/селекторов.
- Используйте `HEADLESS`/`DEMO`; `HEADFUL` устарел (см. предупреждение в `auth/login.js`).
- Для нестандартных форм логина потребуется скорректировать селекторы в `auth/config.js`.

### Безопасность: секреты и артефакты
- По умолчанию каталог `reports/` и локальные `artifacts/` игнорируются Git (риск утечки cookie/скриншотов).
- В репозиторий не должны попадать реальные отчёты и `auth/state.json`.
- Настроен pre-commit‑хук (Husky), который отклоняет коммиты, содержащие `auth/state.json`, `reports/` или `artifacts/`.
  - Установка хуков происходит автоматически через `npm install` (скрипт `prepare`).

### Запуск цикла (Orchestrator)
Скрипт высокого уровня последовательно выполняет роли (Explorer → Controller → Developer → QA → Manager) и пишет общий журнал:

```bash
npm run cycle -- "Цель в свободной форме"
```

- Лимит попыток Controller: `CONTROLLER_MAX_ATTEMPTS` (по умолчанию 2)
- Таймаут шагов Developer: `DEV_STEP_TIMEOUT_SEC` (по умолчанию 30)
- Журнал цикла: `reports/orchestrator/cycle.jsonl`
- Префлайт: перед началом выполняется `node auth/check_auth.js`; при `NEEDS_LOGIN` цикл прерывается с подсказкой обновить `auth/state.json`.
- Shared Playwright context: модули переиспользуют конфигурацию таймаутов/ретраев из `auth/config.js` через `scripts/playwright/context.ts`.

Примечание: текущая реализация содержит заглушки вызовов MCP для ролей и создаёт минимальные артефакты согласно схемам; замените заглушки на конкретные команды MCP в вашей среде.

### Модули ролей (локальные скрипты)
Каждая роль имеет исполняемый модуль с функцией `run()` и артефактами по схемам:
- Explorer: `scripts/explorer/run.ts` → `reports/explore/inventory.json`
- Controller: `scripts/controller/run.ts` → `reports/control/plan.json` (читает `DESIRED_PATH` или `desired/example_workflow.json`)
- Developer: `scripts/developer/run.ts` → `reports/developer/execution.jsonl`
- QA: `scripts/qa/run.ts` → использует `scripts/qa/verify.ts`, пишет `reports/qa/report.json`
- Manager: `scripts/manager/run.ts` → `reports/manager/operations.jsonl`

Общий Playwright‑контекст: `scripts/playwright/context.ts`, обёртка для оркестрации: `scripts/orchestrator/context.ts`.

### Desired state (вход контроллера)
Контроллер читает JSON‑описание желаемого состояния:
- По умолчанию: `desired/example_workflow.json`
- Можно задать свой путь через `DESIRED_PATH=/path/to/desired.json`

Формат можно расширять; контроллер должен формировать детерминированный план (`reports/control/plan.json`), который затем исполняется Developer.

### Траблшутинг
- `OK: authorized ...` — авторизация валидна
- `NEEDS_LOGIN: login form detected` — выполните `npm run auth:refresh` или `auth:demo`
- `UNKNOWN: could not confirm auth state` — возможны нестандартные селекторы: повторите `auth:demo`, проверьте UI
- Предупреждение «Must be a valid email» — укажите корректный email в `N8N_USERNAME`/`N8N_EMAIL`
- Краш браузера в headless среде — запустите локально `auth:demo` (headed)

### Роли и спецификации
Роли описаны в каталоге `roles/` и используются в процессе автоматизации:
- Orchestrator — `roles/orchestrator.md`
- Controller — `roles/controller.md`
- Explorer — `roles/explorer.md`
- Developer — `roles/developer.md`
- Manager — `roles/manager.md`
- QA — `roles/qa.md`

## Overview
This document describes how all automation roles collaborate to build, verify, and maintain n8n workflows through MCP Playwright.
Each role operates within clear boundaries and communicates via structured artifacts and state reports.

---

## 🧠 Orchestrator
Purpose: coordinates high-level goals and ensures overall safety and consistency.
Responsibilities:
- Receives user goals and decomposes them into actionable intents.
- Delegates work to Controller, Explorer, Developer, Manager, and QA.
- Defines stop-rules, rollback policies, and safety limits.
- Consolidates final reports and outcomes from all other roles.

Inputs: user requests or objectives.
Outputs: orchestrated task plan, status reports, global success/failure summary.

---

## 🧩 Controller
Purpose: maintain alignment between desired and actual workflow states.
Responsibilities:
- Compares desired configuration with actual n8n UI state.
- Produces action plans for Developer (create/update/delete).
- Requests new scans from Explorer if unknown UI elements appear.
- Iteratively re-runs plans until convergence (desired == actual).
- Provides detailed diff and convergence reports to Orchestrator and QA.

Inputs: desired state JSON + Explorer inventory.
Outputs: structured action plan, convergence report, safety flags.

---

## 🧭 Explorer
Purpose: observe and map the n8n interface without making changes.
Responsibilities:
- Crawl UI screens and collect metadata about available nodes, panels, and actions.
- Identify unknown or changed elements and capture their DOM selectors.
- Produce inventory snapshots for Controller and Developer.

Inputs: Orchestrator request or Controller query.
Outputs: inventory dump (selectors, node types, UI states) in `/reports/explore/`.

---

## 🧑‍💻 Developer
Purpose: execute the Controller’s plan by performing verified UI actions.
Responsibilities:
- Create, modify, or configure workflows and nodes via Playwright.
- Apply idempotent operations with validation and safe waits.
- Report back results and logs for QA and Controller.
- Never act outside a confirmed plan.

Inputs: action plan from Controller.
Outputs: execution log, success/failure status, updated workflow state.

---

## 🧩 Manager
Purpose: handle operational tasks on existing workflows.
Responsibilities:
- Open, rename, enable/disable, and tag workflows.
- Manage existing assets without structural modification.
- Support Orchestrator in housekeeping and version control.

Inputs: Orchestrator or Developer requests.
Outputs: updated metadata and operational logs.

---

## ✅ QA
Purpose: verify correctness, stability, and reproducibility of all actions.
Responsibilities:
- Validate Developer results and confirm Controller convergence.
- Capture artifacts (screenshots, console logs).
- Detect flaky or inconsistent behavior and trigger limited retries.
- Produce human-readable and machine-readable verification reports.

Inputs: Developer logs, Controller diff reports, runtime artifacts.
Outputs: PASS/FAIL/RETRY reports with artifact links.

---

## 🔗 Communication Flow
1. Orchestrator defines the goal → sends to Controller.
2. Controller checks desired vs actual → requests Explorer data if needed.
3. Explorer scans UI → returns inventory to Controller.
4. Controller builds an action plan → delegates to Developer.
5. Developer performs actions in n8n UI → logs every step.
6. QA validates outcomes → produces verification report.
7. Manager applies operational metadata changes (rename, tags, enable).
8. Controller rechecks alignment → sends convergence status to Orchestrator.
9. Orchestrator finalizes the task → stores global report and metrics.

---

## 📁 Artifacts and Data Flow
| Source Role | Artifact | Consumer Role |
|--------------|-----------|----------------|
| Explorer | Inventory Snapshot | Controller, Developer |
| Controller | Action Plan (Diff) | Developer |
| Developer | Execution Log | QA, Controller |
| QA | Verification Report | Orchestrator |
| Manager | Operational Log | Orchestrator |
| Orchestrator | Global Summary | System/End User |

---

## ⚙️ Safety and Governance
- All modifying actions must originate from a validated Controller plan.
- QA is the only authority to mark a cycle as PASSED or FAILED.
- Orchestrator enforces execution caps and rollback logic.
- Explorer and QA never perform destructive or modifying actions.

---

## 📊 Cycle States
1. INITIATED — goal accepted by Orchestrator
2. PLANNED — Controller generated action plan
3. EXECUTED — Developer performed plan steps
4. VERIFIED — QA validated results
5. CONVERGED — Controller confirmed no diffs remain
6. COMPLETED — Orchestrator finalized and archived results

---

## RACI Matrix (Responsibilities)
Legend: R = Responsible (does the work), A = Accountable (owns the outcome), C = Consulted, I = Informed

| Activity | Orchestrator | Controller | Explorer | Developer | Manager | QA |
|---|---|---|---|---|---|---|
| Define high-level goal, safety limits | A/R | C | I | I | I | I |
| Inventory scan of UI | I | C | A/R | I | I | I |
| Desired vs Actual diff and action plan | I | A/R | C | C | I | I |
| Execute structural changes (nodes, params, connections) | I | A (plan authority) | I | R | I | C |
| Operational updates (title rename, tags) | A | I | I | I | R | C |
| Enable/disable workflow | A | I | I | I | R | C |
| Publish/activate workflow (with confirmation) | A | I | I | I | R | C |
| Destructive actions (delete nodes/workflows) [1] | A (final approval) | A (plan) | I | R (nodes) | R (workflows) | C |
| Verification and evidence capture | I | C | I | C | I | A/R |
| Convergence check (no diffs remain) | I | A/R | I | C | I | C |
| Rollback / escalation on failure | A/R | C | I | C | C | C |
| Final global report and archive | A/R | C | C | C | C | C |

[1] Destructive actions require explicit confirmation and a validated Controller plan; never executed ad‑hoc.

---

## Adding New Roles (Extension Guidelines)
- Purpose & Boundaries: define a single clear objective and ensure it does not overlap existing roles. If overlap exists, narrow the scope or delegate to the existing role.
- Interfaces & Artifacts: specify inputs, outputs, and artifact paths (JSON reports, screenshots, traces). Prefer structured, machine‑readable formats.
- Safety & Governance: declare prohibited actions, rate/time limits, and escalation rules. Respect Controller plan authority for any modifications.
- RACI Update: add the role to the matrix with explicit R/A/C/I for key activities; avoid multiple Accountables per activity.
- Communication Flow: state where the role plugs into the 9‑step flow (before/after which step) and which roles it consults.
- Implementation Checklist:
  - Role spec file under `roles/` with Purpose, Allowed/Non‑Allowed, Operational Principles, Environment, Outputs
  - Scripts or playbooks (if needed) reuse existing auth and helpers; no new auth logic
  - Reports directory defined (e.g., `/reports/<role>/` or `/artifacts/<timestamp>/`)
  - README updates: roles summary, RACI row, flow integration


### Дальнейшие шаги
По мере появления новых сценариев добавляйте минимальные роли/скрипты. Текущий репозиторий очищен и подготовлен под старт «с нуля».
