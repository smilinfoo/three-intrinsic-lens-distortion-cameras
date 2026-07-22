#!/usr/bin/env bash
# Shared helpers for running Python inside the project virtual environment.
# Works with any Python 3.10+ interpreter (conda, pyenv, Homebrew, system, etc.).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="${ROOT}/.venv"

find_python() {
  if [[ -n "${PYTHON:-}" ]] && command -v "${PYTHON}" &>/dev/null; then
    echo "${PYTHON}"
    return
  fi

  local cmd
  for cmd in python3.13 python3.12 python3.11 python3.10 python3 python; do
    if command -v "${cmd}" &>/dev/null; then
      if "${cmd}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
        echo "${cmd}"
        return
      fi
    fi
  done

  echo "ERROR: Python 3.10+ not found. Install it or set PYTHON to your interpreter." >&2
  exit 1
}

require_python310() {
  local python="$1"
  if ! "${python}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
    echo "ERROR: Python 3.10+ required, got $("${python}" --version 2>&1)" >&2
    exit 1
  fi
}

ensure_venv() {
  if [[ -x "${VENV}/bin/python" ]]; then
    return
  fi

  local python
  python="$(find_python)"
  require_python310 "${python}"

  echo "Creating project virtual environment at .venv"
  "${python}" -m venv "${VENV}"
}

activate_venv() {
  ensure_venv
  export VIRTUAL_ENV="${VENV}"
  export PATH="${VENV}/bin:${PATH}"
  export PYTHONPATH="${ROOT}/reference/src${PYTHONPATH:+:${PYTHONPATH}}"
}
