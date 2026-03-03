#!/bin/bash
# SheBloom Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENV=${1:-staging}
echo "Deploying SheBloom to $ENV..."

# Validate environment
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "Usage: ./scripts/deploy.sh [staging|production]"
  exit 1
fi

# Check required tools
for cmd in docker node npm; do
  if ! command -v $cmd &> /dev/null; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

# Check environment file
if [ ! -f ".env.$ENV" ]; then
  echo "Error: .env.$ENV file not found. Copy from env-example and configure."
  exit 1
fi

echo "Step 1: Loading environment..."
export $(grep -v '^#' .env.$ENV | xargs)

echo "Step 2: Building Docker images..."
docker compose -f docker-compose.yml build --no-cache

echo "Step 3: Running database migrations..."
docker compose exec -T api npx prisma migrate deploy

echo "Step 4: Starting services..."
docker compose -f docker-compose.yml up -d

echo "Step 5: Running health checks..."
sleep 5
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health || echo "000")
if [ "$API_STATUS" = "200" ]; then
  echo "API: HEALTHY"
else
  echo "API: UNHEALTHY (status: $API_STATUS)"
  echo "Check logs with: docker compose logs api"
fi

CLIENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$CLIENT_STATUS" = "200" ]; then
  echo "Client: HEALTHY"
else
  echo "Client: UNHEALTHY (status: $CLIENT_STATUS)"
fi

echo ""
echo "Deployment complete!"
echo "  API:    http://localhost:8000"
echo "  Client: http://localhost:3000"
echo "  Docs:   http://localhost:8000/api-docs"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose exec api npx prisma studio  # Database GUI"
echo "  docker compose down            # Stop all services"
