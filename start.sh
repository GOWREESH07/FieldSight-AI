#!/usr/bin/env zsh
# FieldSight — Start both backend and frontend
# Usage: ./start.sh

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FieldSight — AI Video Intelligence Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# --- Backend ---
echo "▶ Starting backend (FastAPI)..."
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q

# Start backend in background
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID — http://localhost:8000"

# --- Frontend ---
echo ""
echo "▶ Starting frontend (Next.js)..."
cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "  Installing npm dependencies..."
  npm install
fi

# Start frontend in foreground (so Ctrl+C stops everything)
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID — http://localhost:3000"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FieldSight is running!"
echo "  Open: http://localhost:3000"
echo "  Press Ctrl+C to stop all services."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for either process to exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
