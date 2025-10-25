# n8n Auth Bootstrap (Playwright MCP)

Минимальный репозиторий для авторизации в n8n через Playwright MCP. Содержит только артефакты авторизации (`auth/state.json`) и команды запуска MCP‑сервера. Все прежние скрипты и роли удалены — начинаем с нуля.

### Структура
```
auth/
  ├─ login.js
  ├─ refresh_state.sh
  └─ state.json
package.json
README.md
```

### Переменные окружения
- N8N_URL — базовый URL инстанса n8n (например, https://your-n8n.example)

### Аутентификация (storageState)
Сохраняем cookie в `auth/state.json` и используем их при запуске MCP‑сервера.

1) Установите зависимости (локально):
```bash
npm install
```

2) Обновите `auth/state.json` при необходимости:
```bash
npm run auth:refresh
```

3) Запустите MCP‑сервер Playwright с сохраненным состоянием:
```bash
npm run mcp:start
# эквивалентно:
# npx @playwright/mcp@latest --storage-state=auth/state.json
```

Если cookie валидны, последующие действия в n8n будут выполняться без повторного логина.

### Дальнейшие шаги
По мере появления новых сценариев добавляйте минимальные роли/скрипты. Текущий репозиторий очищен и подготовлен под старт «с нуля».
