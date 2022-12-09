FROM alpine:latest as build-image

ARG APP_ROOT="/app"
WORKDIR $APP_ROOT

RUN apk update && apk upgrade && apk add --update --no-cache curl grep wget coreutils unzip

RUN curl -s https://api.github.com/repos/somleng/sms-gateway/releases/latest \
  | grep "somleng-sms-gateway-alpine-x86_64-v.*.zip" \
  | cut -d : -f 2,3 \
  | tr -d \" \
  | wget -qi - -O somleng-sms-gateway.zip \
  | echo "downloading..."

RUN unzip somleng-sms-gateway.zip
RUN rm somleng-sms-gateway.zip

# #############################

FROM alpine:latest

ARG APP_ROOT="/app"
WORKDIR $APP_ROOT
ENV PATH "$PATH:$APP_ROOT"

COPY --from=build-image $APP_ROOT $APP_ROOT
RUN export
CMD ["somleng-sms-gateway"]
