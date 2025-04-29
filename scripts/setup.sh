op inject -i ./scripts/templates/.env.cli.example -o ./apps/cli/.env
op inject -i ./scripts/templates/.env.admin.example -o ./apps/admin/.env
USERNAME=$(echo "$USER" | tr '[:lower:]' '[:upper:]') op inject -i ./scripts/templates/.env.backend.example -o ./apps/backend/.env

bun install