#!/usr/bin/env bash
# Runs the schema and rule checks on a throwaway local PostgreSQL 15+.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}
DIR=$(mktemp -d); PORT=55432
AS=""; if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; AS="runuser -u postgres --"; fi
$AS "$BIN/initdb" -D "$DIR/d" -U postgres >/dev/null
$AS "$BIN/pg_ctl" -D "$DIR/d" -o "-p $PORT -k $DIR" -l "$DIR/log" -w start >/dev/null
trap '$AS "$BIN/pg_ctl" -D "$DIR/d" -m immediate stop >/dev/null; rm -rf "$DIR"' EXIT
Q() { psql -h "$DIR" -p $PORT -U postgres -d postgres -q -v ON_ERROR_STOP=1 "$@"; }
Q -f tests/stubs.sql -f supabase/schema.sql -f supabase/seed.sql -f supabase/storage.sql
Q -f tests/rules.sql -o /dev/null
# Price parity: the database must agree with the app
node --experimental-strip-types tests/parity.ts | Q -At -f - | grep -qx 0 && echo "PRICE PARITY PASSED"
