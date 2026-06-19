#!/bin/sh
set -eu

CONFIG_FILE="config.json"
ENV_CONFIG="${GATEWAY_CONFIG_JSON:-}"

# Support Docker-style invocation:
#   entrypoint.sh somleng-sms-gateway --config ./config.json
# as well as:
#   entrypoint.sh --config ./config.json
if [ "${1:-}" = "somleng-sms-gateway" ]; then
  shift
fi

# If config exists in the environment variable, write it to a file and use it as the gateway config.
#
# Example:
#   GATEWAY_CONFIG_JSON='{"foo":"bar"}' entrypoint.sh
# becomes:
#   somleng-sms-gateway --config config.json
if [ -n "$ENV_CONFIG" ]; then
  printf '%s' "$ENV_CONFIG" > "$CONFIG_FILE"
  set -- --config "$CONFIG_FILE" "$@"
fi

exec somleng-sms-gateway "$@"
