FROM debian:bookworm-slim as build-image

ARG APP_ROOT="/app"
WORKDIR $APP_ROOT

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl grep wget ca-certificates unzip jq

RUN curl -s https://api.github.com/repos/somleng/sms-gateway/releases/latest \
  | jq ".assets[].browser_download_url" \
  | grep "somleng-sms-gateway-linux-$(arch)-v.*.zip" \
  | tr -d \" \
  | wget -qi - -O somleng-sms-gateway.zip \
  | echo "downloading..."

RUN unzip somleng-sms-gateway.zip && \
    rm somleng-sms-gateway.zip && \
    chmod +x somleng-sms-gateway

FROM debian:bookworm-slim

ARG APP_ROOT="/app"
WORKDIR $APP_ROOT
ENV PATH "$PATH:$APP_ROOT"

COPY --from=build-image $APP_ROOT $APP_ROOT
CMD ["somleng-sms-gateway"]
