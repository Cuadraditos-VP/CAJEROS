#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Necesitás instalar Node.js (https://nodejs.org)"; exit 1; }
node server.js
