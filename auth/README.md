# 🔐 Как сохранить cookie n8n для mcp-playwright

1. Установи Playwright CLI, если не установлен:
   ```bash
   npm install -g playwright
   ```

2. Открой браузер и войди в n8n:
   ```bash
   playwright codegen https://n8n.aicontenthub.ru
   ```
   После входа откроется редактор кода Playwright.  
   В нём выполни:
   ```bash
   await context.storageState({ path: 'auth/state.json' })
   ```
   Файл `auth/state.json` сохранит твои cookie.

3. Закрой браузер и убедись, что `auth/state.json` создан.

4. Теперь запусти MCP:
   ```bash
   mcp-playwright start --storage-state=auth/state.json --headful
   ```

5. Открой проект в Cursor и напиши:
   ```
   Открой воркфлоу по ссылке https://n8n.aicontenthub.ru/workflow/Azd05Jt3CtEg8wLd
   ```
   Если cookie действительны — n8n откроется сразу, без авторизации.
