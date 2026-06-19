#!/bin/sh
set -eu

CONFIG_PATH="./config.json"
ENV_CONFIG="${GATEWAY_CONFIG_JSON:-}"

# Support Docker-style invocation:
#   entrypoint.sh somleng-sms-gateway --config /etc/config.json
# as well as:
#   entrypoint.sh --config /etc/config.json
if [ "${1:-}" = "somleng-sms-gateway" ]; then
  shift
fi

# If no arguments were provided and config exists in the environment variable,
# write it to a file and use that file as the gateway config.
#
# Example:
#   GATEWAY_CONFIG_JSON='{"foo":"bar"}' entrypoint.sh
# becomes:
#   somleng-sms-gateway --config /tmp/gateway-config.json
if [ -n "$ENV_CONFIG" ] && [ "$#" -eq 0 ]; then
  printf '%s' "$ENV_CONFIG" > "$CONFIG_PATH"
  set -- --config "$CONFIG_PATH"
fi

exec somleng-sms-gateway "$@"
