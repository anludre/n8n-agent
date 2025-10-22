# MCP + Playwright → n8n Orchestration

Этот репозиторий автоматизирует работу в n8n через Playwright: создаём/переименовываем/сохраняем воркфлоу, настраиваем ноды и т.д. Скрипты можно вызывать повторно, они стремятся быть идемпотентными и «строгими» (без побочных эффектов при сбое).

### Содержание
- Обзор и структура
- Переменные окружения
- Аутентификация (cookie storageState)
- Запуск MCP‑сервера Playwright
- Каталог скриптов и правила именования
- Тайминги, ретраи и «строгое сохранение»
- Рекомендации по идемпотентности

### Обзор и структура
```
auth/                      # логин и сохранение cookie
  ├─ login.js
  ├─ refresh_state.sh
  └─ README.md
examples/                  # примеры JSON-пошагов для MCP (goto/click/...)
roles/                     # роль-оркестратор для Cursor (описание интентов/селекторов)
scripts/                   # все рабочие скрипты автоматизации n8n
  ├─ wf_create_strict.js
  ├─ wf_create_then_rest_rename.js
  ├─ wf_create_then_ui_rename.js
  ├─ wf_rename_latest.js
  └─ wf_rename_by_title.js
readme_scripts.md          # реестр скриптов и правило именования
package.json               # npm-скрипты, devDeps (playwright)
README.md                  # вы читаете его
```

### Переменные окружения
- N8N_URL — базовый URL инстанса n8n (например, https://n8n.aicontenthub.ru)
- WORKFLOW_NAME — целевое имя создаваемого/переименовываемого воркфлоу
- FROM_TITLE / TO_TITLE — для переименования по текущему заголовку

Можно хранить в `.env` и подхватывать в скриптах оболочки.

### Аутентификация
Скрипты используют Playwright `storageState` с cookie в `auth/state.json`.
- Смотри `auth/README.md` для пошаговой инструкции (через `playwright codegen ...` и `context.storageState`).
- Для обновления cookie: `npm run auth:refresh` (скрипт вызывает `auth/refresh_state.sh`).

### MCP‑сервер Playwright
В `package.json` есть alias для запуска MCP‑сервера:
```bash
npm run mcp:start  # npx @playwright/mcp@latest --storage-state=auth/state.json
```
Далее можно отправлять JSON‑шаги из `examples/` (goto/waitForSelector/click/...)

### Каталог скриптов и правило именования
Смотри подробности в `readme_scripts.md`. Кратко: формат имён — `<domain>_<action>[_<qualifier>].js`, где `domain=wf` (workflow), `action=create|rename|...`, qualifier уточняет стратегию: `strict|latest|by_title|then_ui_rename|then_rest_rename`.

Основные скрипты:
- scripts/wf_create_strict.js — «строгое» создание: не жмёт Save, пока видимый заголовок не совпал с `WORKFLOW_NAME`; при невыполнении условия — аварийный выход без сохранения.
- scripts/wf_create_then_rest_rename.js — создаёт и сохраняет воркфлоу, затем переименовывает через REST и проверяет заголовок после перезагрузки.
- scripts/wf_create_then_ui_rename.js — создаёт и сохраняет воркфлоу, затем переименовывает через UI (инлайн‑редактор) с ретраями, после чего сохраняет.
- scripts/wf_rename_latest.js — находит последний обновлённый воркфлоу через REST и открывает `/workflow/{id}`, затем переименовывает через UI строго (верификация перед Save).
- scripts/wf_rename_by_title.js — открывает по текущему заголовку из списка и переименовывает в `TO_TITLE` (с верификацией).

### Правило именования скриптов
- Формат: `<domain>_<action>[_<qualifier>].js`
- Примеры: `wf_create_strict.js`, `wf_rename_by_title.js`, `wf_create_then_ui_rename.js`.
- domain: `wf` — операции с воркфлоу (можно добавить другие домены: `cred`, `exec` и т.д.)
- action: `create | rename | delete | execute | export | import`
- qualifier (опц.): уточнение стратегии — `strict | latest | by_title | then_ui_rename | then_rest_rename`

### Тайминги, ретраи и «строгое сохранение»
Скрипты учитывают асинхронность UI n8n и используют следующие приёмы:
- Явные ожидания: `waitForSelector`, `waitForLoadState('networkidle')`, короткие `waitForTimeout(200–500ms)` между активациями инлайн‑редактора.
- Ретраи инлайн‑редактора: до 2–3 попыток dblclick→click, затем ввод текста и commit (Enter/blur).
- Альтернативные каналы ввода: `fill()`, `type()`, либо прямое присваивание значения через `evaluate` для `<input>` или `[contenteditable]` с генерацией `input/change` событий.
- Верификация до сохранения: Save выполняется только если «инвариант» достигнут — видимый заголовок на канвасе совпадает с целевым именем (либо подтверждена корректность значения в активном инпуте). Иначе — выход без Save, чтобы не плодить «My workflow N».

Практические ориентиры времени (можно корректировать под среду):
- Открытие основного UI: до 3–5 c (`waitForSelector` на кнопку New/Create Workflow).
- Появление инлайн‑редактора: до 8–12 c (в тяжёлых случаях с задержкой рендера).
- Сохранение воркфлоу: ожидание `networkidle` 1–3 c.
- Полный цикл «создать‑переименовать‑сохранить»: обычно 5–12 c, в зависимости от сети и нагрузки UI.

### Рекомендации по идемпотентности
- Сначала поиск, потом создание: по `WORKFLOW_NAME` или по метке/тегу (можно хранить маркер в описании воркфлоу и читать через REST).
- При провале верификации — безопасный выход без Save.
- Для переименования: всегда проверять изменение заголовка перед итоговым Save.
- Логи: каждый скрипт печатает один короткий итог (например, `DONE`, `RENAMED`, `CREATED_AND_RENAMED`), а при ошибке — понятное сообщение и ненулевой код выхода.

### Примеры запуска
```bash
# 1) Запуск MCP‑сервера
npm run mcp:start

# 2) Создать новый воркфлоу строго (без побочных эффектов при сбое)
WORKFLOW_NAME=Test_Strict node scripts/wf_create_strict.js

# 3) Создать и переименовать через REST
WORKFLOW_NAME=Test_Rest node scripts/wf_create_then_rest_rename.js

# 4) Создать и переименовать через UI (инлайн)
WORKFLOW_NAME=Test_UI node scripts/wf_create_then_ui_rename.js

# 5) Переименовать последний обновлённый воркфлоу
WORKFLOW_NAME=Target node scripts/wf_rename_latest.js

# 6) Переименовать по текущему заголовку
FROM_TITLE='My workflow 3' TO_TITLE='Target' node scripts/wf_rename_by_title.js
```
