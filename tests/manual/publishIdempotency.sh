#!/usr/bin/env bash
# Exercises the REAL firmware publish script (extracted from the workflow YAML,
# not a copy) against a stubbed gh, so release-publish regressions are caught
# without cutting a tag. Run from the repo root: bash tests/manual/publishIdempotency.sh
set -uo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p /tmp/pubtest
cd /tmp/pubtest
node -e "
const fs=require('fs'), yaml=require('$repo_root/node_modules/js-yaml');
const d=yaml.load(fs.readFileSync('$repo_root/.github/workflows/qmk-build.yml','utf8'));
const s=d.jobs['build-firmware'].steps.find(x=>x.name==='Publish firmware to tagged release');
if(!s) { console.error('publish step not found'); process.exit(1); }
fs.writeFileSync('/tmp/pubtest/publish.sh', s.run);
" || exit 1
export RUNNER_TEMP=/tmp/pubtest/runner
export GITHUB_REF_NAME=v9.9.9
export GITHUB_REPOSITORY=owner/repo
mkdir -p "$RUNNER_TEMP/grid-macro-1-via-artifact"
for f in grid_macro_1_via.uf2 SHA256SUMS.txt BUILD-INFO.txt; do
  echo dummy > "$RUNNER_TEMP/grid-macro-1-via-artifact/$f"
done

mkdir -p bin
cat > bin/gh <<'STUB'
#!/usr/bin/env bash
echo "GH_CALL: $*" >> /tmp/pubtest/calls.log
case "$1 $2" in
  "release view")
    if [ "${RELEASE_EXISTS:-1}" = "0" ]; then exit 1; fi
    # --jq '.assets[].name' form used by the new existence check
    for a in "$@"; do
      if [ "$a" = ".assets[].name" ]; then printf '%s' "${EXISTING_ASSETS:-}"; exit 0; fi
    done
    exit 0 ;;
  "release upload") exit "${UPLOAD_RC:-0}" ;;
  "release create") exit "${CREATE_RC:-0}" ;;
esac
exit 0
STUB
chmod +x bin/gh
export PATH=/tmp/pubtest/bin:$PATH

run_case() {
  local name="$1"; shift
  : > calls.log
  ( "$@" bash publish.sh ) > out.log 2>&1
  local rc=$?
  echo "--- $name (exit=$rc)"
  cat out.log | sed 's/^/    /'
  echo "    gh calls:"; sed 's/^/      /' calls.log
  echo "$rc" > last_rc
}

pass=0; fail=0
check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "    ASSERT FAIL: $3"; fi }

# 1. Published release already has every asset -> must skip, never upload/clobber.
run_case "all assets already present (the failure we hit)" \
  env RELEASE_EXISTS=1 EXISTING_ASSETS=$'grid_macro_1_via.uf2\nSHA256SUMS.txt\nBUILD-INFO.txt\n'
check "$(cat last_rc)" 0 "should succeed"
check "$(grep -c 'nothing to upload' out.log)" 1 "should report skip"
check "$(grep -c 'release upload\|release create' calls.log)" 0 "must not upload or create"
check "$(grep -c 'clobber' calls.log)" 0 "must never clobber"

# 2. No release yet -> create with all three assets.
run_case "no release exists yet" env RELEASE_EXISTS=0
check "$(cat last_rc)" 0 "should succeed"
check "$(grep -c 'release create' calls.log)" 1 "should create release"
check "$(grep -c 'grid_macro_1_via.uf2' calls.log)" 1 "should include uf2"

# 3. Release exists but firmware assets absent -> upload all three, no clobber.
run_case "release exists, no firmware assets" env RELEASE_EXISTS=1 EXISTING_ASSETS=""
check "$(cat last_rc)" 0 "should succeed"
check "$(grep -c 'release upload' calls.log)" 1 "should upload"
check "$(grep -c 'clobber' calls.log)" 0 "must not clobber"

# 4. Partially present -> upload ONLY the missing one.
run_case "only uf2 present, checksums missing" \
  env RELEASE_EXISTS=1 EXISTING_ASSETS=$'grid_macro_1_via.uf2\n'
check "$(cat last_rc)" 0 "should succeed"
check "$(grep -c 'SHA256SUMS.txt' calls.log)" 1 "should upload missing checksum"
check "$(grep -c 'BUILD-INFO.txt' calls.log)" 1 "should upload missing provenance"
upload_line=$(grep 'release upload' calls.log)
if echo "$upload_line" | grep -q 'grid_macro_1_via.uf2'; then
  fail=$((fail+1)); echo "    ASSERT FAIL: re-uploaded an asset that already exists"
else pass=$((pass+1)); fi

# 5. Genuine upload failure must still fail the job (no error swallowing).
run_case "upload genuinely fails" env RELEASE_EXISTS=1 EXISTING_ASSETS="" UPLOAD_RC=1
check "$(cat last_rc)" 1 "must propagate real failure"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
