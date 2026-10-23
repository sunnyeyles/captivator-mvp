#!/usr/bin/env bash
# PreToolUse:Read — deny an unbounded Read of a large text file.
#
# Reading a whole generated file is the largest unpredictable token spike
# available: a lockfile can run to hundreds of KB, well over 100k tokens.
# The cap is set above the largest legitimate source file so it never fires on
# hand-written code. Passing `limit` always bypasses it, and
# CLAUDE_READ_CAP_BYTES overrides the threshold.
#
# Exit 0 with no output = allow. Denial is JSON on stdout; the reason is fed
# back to Claude, which can then re-read with limit/offset. Deliberately does
# NOT set `continue: false` — that would end the turn rather than redirect it.

input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
lim=$(printf '%s' "$input" | jq -r '.tool_input.limit // empty' 2>/dev/null)
cap="${CLAUDE_READ_CAP_BYTES:-60000}"

[ -n "$f" ] || exit 0   # no path — let Read report its own error
[ -z "$lim" ] || exit 0 # already bounded
[ -f "$f" ] && [ -r "$f" ] || exit 0

# Read renders these visually rather than as text; blocking a screenshot would
# break any workflow that takes one.
case "$f" in
*.png | *.jpg | *.jpeg | *.gif | *.webp | *.bmp | *.svg | *.pdf | *.ico) exit 0 ;;
esac

size=$(wc -c <"$f" 2>/dev/null | tr -d ' ')
[ -n "$size" ] || exit 0
[ "$size" -gt "$cap" ] 2>/dev/null || exit 0

jq -n --arg r "Refusing an unbounded Read of $f ($size bytes, cap $cap). Re-read with the limit parameter (plus offset to page through), or use Grep/Glob to locate the relevant lines first." \
	'{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
