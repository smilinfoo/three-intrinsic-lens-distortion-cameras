#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/python-env.sh
source "${ROOT}/scripts/python-env.sh"

activate_venv
exec python -m camera_lab_ref.generate_fixtures "$@"
