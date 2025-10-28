## Авторизация n8n: как подключаться без проблем

Этот файл описывает проверенный порядок действий для авторизации в n8n, обновления cookies и открытия видимого окна браузера с сохранённой сессией. Все команды используют уже существующие скрипты и `dotenv` — переменные читаются из `.env` автоматически.

### Требования окружения
- Node.js: рекомендуем 20.x (поддерживаются версии \(\>=18.18 <23\)). На Node 23 возможны падения headless Chromium.
- npm: 9+.
- Установленные зависимости проекта: `npm install` (Playwright-браузеры ставятся через postinstall).

### Переменные окружения (.env)
Создайте в корне репозитория файл `.env` со значениями:

```env
N8N_URL="https://n8n.example.com"        # Базовый URL вашего n8n
N8N_EMAIL="user@example.com"             # или N8N_USERNAME
N8N_PASSWORD="your_password"             # или N8N_PASS

# Необязательно (для демонстрации/визуализации)
HEADLESS=false      # чтобы видеть окно браузера
DEMO=1              # демо-режим: замедляет действия
SLOWMO=300          # задержка между шагами в мс
DEMO_PAUSE_MS=3000  # пауза после успешного входа
STATE_PATH=auth/state.json
```

### Основные команды
- Проверить авторизацию (OK / NEEDS_LOGIN / UNKNOWN):
```bash
npm run -s auth:check
```

- Обновить/получить cookies (headful вход; читает .env):
```bash
npm run auth:refresh
```

- Открыть видимое окно с сохранённой сессией и оставить его открытым:
```bash
# Вариант через npm exec (предпочтительно)
KEEP_OPEN=1 HEADLESS=false npm exec tsx scripts/playwright/show_auth.ts

# Альтернативно через npx, если в PATH нет локального tsx
KEEP_OPEN=1 HEADLESS=false npx tsx scripts/playwright/show_auth.ts
```

Скриншот текущего экрана сохраняется в `reports/explore/authorized.png`.

### MCP‑сервер (опционально)
Запуск MCP‑сервера Playwright с использованием `auth/state.json`:
```bash
npm run mcp:start
```

### Типичный сценарий подключения
1) Подготовить окружение и зависимости:
```bash
npm install
```
2) Заполнить `.env` (см. шаблон выше).
3) Проверить авторизацию:
```bash
npm run -s auth:check
```
   - Если `NEEDS_LOGIN` или `UNKNOWN` — выполнить headful вход:
```bash
npm run auth:refresh
```
4) Открыть окно сессии и оставить его открытым:
```bash
KEEP_OPEN=1 HEADLESS=false npm exec tsx scripts/playwright/show_auth.ts
```

### Траблшутинг
- "command not found: tsx": запускайте через `npm exec tsx ...` или `npx tsx ...` вместо голого `tsx`.
- Node 23.x: возможен крэш headless Chromium (SIGSEGV). Используйте Node 20.x.
- `UNKNOWN: could not confirm auth state`: выполните `npm run auth:refresh` (headful), затем повторите `auth:check` или сразу откройте окно через `show_auth.ts`.
- Окно не показывается: убедитесь, что `HEADLESS=false` и (при необходимости) `DEMO=1`, `SLOWMO` заданы.
- Локализация UI: селекторы в `auth/config.js` уже включают английские и русские маркеры. При редизайне UI дополняйте селекторы там.

### Где лежат артефакты и состояние
- Cookies/стейт: `auth/state.json` (обновляется `auth:refresh`).
- Скриншоты/репорты: `reports/**`.
- Гит‑безопасность: репозиторий настроен так, чтобы не коммитить `auth/state.json` и артефакты из `reports/`.

### Коды выхода (на память)
- `auth:check`:
  - 0 — OK (авторизовано)
  - 2 — NEEDS_LOGIN (видна форма логина)
  - 3 — UNKNOWN (не удалось подтвердить состояние)
  - 1 — ERROR (непредвидённая ошибка)

- `auth:refresh`:
  - 0 — Успешный логин и сохранение state
  - 1 — Нет `N8N_URL`
  - 2 — Нет учётных данных
  - 10 — Не удалось залогиниться после ретраев

### Короткий чек‑лист перед запуском
- Установлены зависимости (`npm install`).
- `.env` заполнен (URL + email/пароль).
- Используется Node 20.x.
- Для видимого окна: `HEADLESS=false`.

Эти шаги обеспечивают воспроизводимый вход и открытие n8n без ручных правок кода.


