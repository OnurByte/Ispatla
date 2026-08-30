#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
env_dir="${XDG_CONFIG_HOME:-$HOME/.config}/ispatla"
bun_bin="${BUN_BIN:-$HOME/.bun/bin/bun}"

if [[ ! -x "$bun_bin" ]]; then
  echo "Bun bulunamadı: $bun_bin" >&2
  echo "BUN_BIN=/mutlak/yol/bun ile tekrar çalıştır." >&2
  exit 1
fi
command -v systemctl >/dev/null || { echo "systemctl bulunamadı" >&2; exit 1; }

mkdir -p "$unit_dir" "$env_dir"
install -m 0644 "$repo_dir/systemd/ispatla-scan.service" "$unit_dir/ispatla-scan.service"
install -m 0644 "$repo_dir/systemd/ispatla-scan.timer" "$unit_dir/ispatla-scan.timer"

env_file="$env_dir/worker.env"
if [[ ! -e "$env_file" ]]; then
  umask 077
  cat > "$env_file" <<EOF
# Ispatla user worker. Secret değerlerini yalnız burada tut.
# ISPATLA_SECRET_KEY=
# ISPATLA_DB=$repo_dir/state/ispatla.sqlite3
# AI_COMPATIBLE_API_KEY=
EOF
  chmod 600 "$env_file"
fi

systemctl --user daemon-reload
systemctl --user enable --now ispatla-scan.timer
systemctl --user --no-pager status ispatla-scan.timer
echo
echo "Kuruldu. Ortam dosyası: $env_file"
echo "Log: journalctl --user -u ispatla-scan.service -n 50 --no-pager"
