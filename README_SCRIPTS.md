### Scripts catalog for n8n automation

Ниже — индекс сценариев в `scripts/` и правила именования, чтобы не дублироваться и быстро ориентироваться.

### Правило именования
- Формат: `<domain>_<action>[_<qualifier>].js`
  - **domain**: `wf` — workflow‑операции (можно добавлять другие домены позже: `cred`, `exec` и т.п.)
  - **action**: `create`, `rename`, `delete`, `execute`, `export`, `import`
  - **qualifier** (опционально): уточнение стратегии/канала — `strict`, `latest`, `by_title`, `then_ui_rename`, `then_rest_rename` и т.д.
- Примеры: `wf_create_strict.js`, `wf_rename_latest.js`, `wf_rename_by_title.js`.

Рекомендации к скриптам
- Все скрипты параметризуются через env: `N8N_URL`, `WORKFLOW_NAME`, `FROM_TITLE`, `TO_TITLE` и т.п.
- Идемпотентность: перед созданием — проверка существования (по имени/тегу) и ранний выход.
- Строгость: сохранять изменения только после верификации целевого инварианта (например, заголовок совпал).
- Логи: выводить краткий итог и код возврата (0 — успех; ≠0 — понятная причина).

### Текущие скрипты
- `scripts/wf_create_strict.js` — создать новый воркфлоу строго: не сохраняет, пока заголовок не совпал с `WORKFLOW_NAME`.
- `scripts/wf_create_then_rest_rename.js` — создать, сохранить (получить ID), затем переименовать через REST; проверка заголовка после обновления.
- `scripts/wf_create_then_ui_rename.js` — создать, сохранить, затем переименовать через UI (инлайн‑редактор) с ретраями; повторное сохранение.
- `scripts/wf_rename_latest.js` — открыть последний обновлённый воркфлоу (через REST список) и переименовать его в `WORKFLOW_NAME`.
- `scripts/wf_rename_by_title.js` — открыть воркфлоу из списка по текущему заголовку `FROM_TITLE` и переименовать в `TO_TITLE`.

### Как добавлять новые скрипты
1) Размести файл в `scripts/` и дай имя по правилу.
2) В начале файла перечисли поддерживаемые переменные окружения.
3) Добавь краткое описание и пример запуска в этот файл реестра (`readme_scripts.md`).
4) Если появился скрипт с перекрывающимся назначением — либо расширь существующий флагами, либо явно укажи отличия в описании.

### Примеры запуска
```bash
# Строгое создание (не сохранит, если заголовок не верифицирован)
WORKFLOW_NAME=My_New_Flow node scripts/wf_create_strict.js

# Создать и переименовать через REST
WORKFLOW_NAME=My_Renamed node scripts/wf_create_then_rest_rename.js

# Создать и переименовать через UI (инлайн)
WORKFLOW_NAME=My_Renamed node scripts/wf_create_then_ui_rename.js

# Переименовать последний обновлённый
WORKFLOW_NAME=Target_Name node scripts/wf_rename_latest.js

# Переименовать по текущему заголовку
FROM_TITLE='My workflow 3' TO_TITLE='Target_Name' node scripts/wf_rename_by_title.js
```


