#!/usr/bin/env bash
set -euo pipefail

# Запускает playwright-логин и сохраняет auth/state.json
# Требуются переменные окружения: N8N_URL, N8N_USERNAME, N8N_PASSWORD

# Убедимся, что зависимости есть
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required." >&2
  exit 1
fi

# Выполнить логин
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
node auth/login.js


