#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/python-env.sh
source "${ROOT}/scripts/python-env.sh"

activate_venv

echo "Installing Python reference package into .venv"
python -m pip install --upgrade pip
python -m pip install -e "${ROOT}/reference/"

echo ""
echo "Python environment ready."
echo "  Interpreter: $(python -c 'import sys; print(sys.executable)')"
echo "  OpenCV:      $(python -c 'import cv2; print(cv2.__version__)' 2>/dev/null || echo '(run verify:opencv after install)')"
