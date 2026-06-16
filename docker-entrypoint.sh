#!/bin/sh
set -eu

CONFIG_PATH="/tmp/gateway-config.json"
ENV_CONFIG="${GATEWAY_CONFIG_JSON:-}"

# Support Docker-style invocation:
#   entrypoint.sh somleng-sms-gateway ...
# as well as:
#   entrypoint.sh ...
if [ "${1:-}" = "somleng-sms-gateway" ]; then
  shift
fi

# When config is supplied through the environment and no arguments were passed,
# run the gateway with the generated config file.
if [ -n "$ENV_CONFIG" ] && [ "$#" -eq 0 ]; then
  set -- --config "$CONFIG_PATH"
fi

# Write the environment config only when the gateway will use that file.
if [ -n "$ENV_CONFIG" ] &&
   [ "$#" -eq 2 ] &&
   [ "$1" = "--config" ] &&
   [ "$2" = "$CONFIG_PATH" ]; then
  printf '%s' "$ENV_CONFIG" > "$CONFIG_PATH"
fi

exec somleng-sms-gateway "$@"
