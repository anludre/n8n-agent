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
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Validate required env vars with friendly messages
missing=()
[ -z "${N8N_URL:-}" ] && missing+=("N8N_URL")
if [ -z "${N8N_USERNAME:-}" ] && [ -z "${N8N_EMAIL:-}" ]; then
  missing+=("N8N_USERNAME or N8N_EMAIL")
fi
if [ -z "${N8N_PASSWORD:-}" ] && [ -z "${N8N_PASS:-}" ]; then
  missing+=("N8N_PASSWORD or N8N_PASS")
fi

if [ ${#missing[@]} -ne 0 ]; then
  echo "Missing required environment variables:" >&2
  for v in "${missing[@]}"; do echo " - $v" >&2; done
  echo "Hint: create a .env file with the variables above or export them in your shell." >&2
  exit 2
fi

node auth/login.js


