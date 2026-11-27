set -Eeuo pipefail

BASE=${GROWIN_DEPLOY_BASE:-/var/www/growin}
[[ "$BASE" == /* && "$BASE" != / ]] || exit 2
RELEASE_ID=${1:?Release ID is required}
[[ "$RELEASE_ID" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 2
RELEASE="$BASE/releases/$RELEASE_ID"
exec 9>"${GROWIN_DEPLOY_LOCK:-/var/lock/growin-deploy.lock}"
flock -w 900 9 || { echo 'Deployment lock timeout; no lock was removed.' >&2; exit 1; }
[[ -f "$BASE/.env" && -d "$BASE/logs" ]] || { echo 'Shared .env/logs must be provisioned before deployment.' >&2; exit 1; }
[[ ! -e "$BASE/current" || -L "$BASE/current" ]] || { echo 'current must be a symlink, not a directory.' >&2; exit 1; }
if [[ -L "$BASE/current" ]]; then PREVIOUS=$(readlink -f "$BASE/current"); else PREVIOUS=$BASE; fi
[[ "$PREVIOUS" == "$BASE" || "$PREVIOUS" == "$BASE/releases/"* ]] || exit 2
if [[ ! -f "$PREVIOUS/ecosystem.config.js" || ! -f "$PREVIOUS/.next/BUILD_ID" ]]; then
  if [[ -L "$BASE/current" ]]; then
    echo 'Previous release is broken; operator intervention required.' >&2; exit 1
  fi
  echo 'No previous release; initial bootstrap.' >&2
fi
[[ -f "$RELEASE/.next/BUILD_ID" && -f "$RELEASE/package-lock.json" ]] || exit 2

SWITCHED=0
SUCCESS=0
HEALTH_HOST=${GROWIN_HEALTH_HOST:?Health host is required}
[[ "$HEALTH_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 2

switch_pointer() {
  local target=$1
  local temporary="$BASE/.current-$RELEASE_ID-$BASHPID-$RANDOM"
  [[ ! -e "$temporary" && ! -L "$temporary" ]] || { echo 'Temporary release pointer already exists.' >&2; return 1; }
  ln -s "$target" "$temporary"
  mv -Tf "$temporary" "$BASE/current"
}

ready() {
  local expected=$1
  local body
  for attempt in $(seq 1 30); do
    body=$(curl --fail --silent --show-error --max-time 3 -H "Host: $HEALTH_HOST" http://127.0.0.1:3009/api/health 2>/dev/null) || body=''
    if printf '%s' "$body" | node -e 'let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{try{const x=JSON.parse(s);process.exit(x.ok===true&&x.release===process.argv[1]?0:1)}catch{process.exit(1)}})' "$expected"; then return 0; fi
    sleep 2
  done
  return 1
}

prune_releases() {
  local keep=${GROWIN_RELEASE_KEEP:-3}
  [[ "$keep" =~ ^[0-9]+$ && "$keep" -ge 1 ]] || keep=3
  local -a dirs=()
  while IFS= read -r dir; do dirs+=("$dir"); done < <(find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
  for ((index = keep; index < ${#dirs[@]}; index += 1)); do
    local dir=${dirs[index]}
    [[ "$dir" == "$RELEASE" || "$dir" == "$PREVIOUS" ]] && continue
    rm -rf -- "$dir" || echo "Warning: failed to remove old release $dir" >&2
  done
}

finish() {
  local code=$?
  trap - EXIT INT TERM
  if [[ "$SUCCESS" == 0 && "$SWITCHED" == 1 ]]; then
    echo 'Release failed; restoring previous application artifact. Database is not rolled back.' >&2
    pm2 delete growin growin-worker >/dev/null 2>&1 || true
    if switch_pointer "$PREVIOUS" && pm2 start "$PREVIOUS/ecosystem.config.js"; then
      if [[ -f "$PREVIOUS/.release-id" ]]; then
        ready "$(cat "$PREVIOUS/.release-id")" || echo 'CRITICAL: restored release is not ready; operator intervention required.' >&2
      else
        curl --fail --silent --show-error --retry 15 --retry-delay 2 --retry-connrefused --max-time 3 -H "Host: $HEALTH_HOST" http://127.0.0.1:3009/ >/dev/null || echo 'CRITICAL: legacy application did not recover; operator intervention required.' >&2
      fi
      pm2 save || true
      echo 'Previous PM2 application definition restored.' >&2
    else
      echo 'CRITICAL: rollback failed; operator intervention required.' >&2
    fi
  fi
  exit "$code"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

cd "$RELEASE"
ln -s "$BASE/.env" .env
npm ci --omit=dev
npm run db:migrate
printf '%s\n' "$RELEASE_ID" > .release-id
SWITCHED=1
pm2 delete growin growin-worker >/dev/null 2>&1 || true
switch_pointer "$RELEASE"
pm2 start "$RELEASE/ecosystem.config.js"
ready "$RELEASE_ID" || { echo 'New release failed readiness checks.' >&2; exit 1; }
pm2 save
SUCCESS=1
prune_releases || echo 'Warning: release pruning failed.' >&2
printf 'Release %s is ready. Previous artifact retained at %s\n' "$RELEASE_ID" "$PREVIOUS"
