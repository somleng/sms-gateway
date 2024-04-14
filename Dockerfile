FROM public.ecr.aws/docker/library/node:current-alpine as build-base
WORKDIR "/src"
RUN apk update --no-cache && \
    apk upgrade --no-cache && \
    apk add --update --no-cache git
RUN git clone https://github.com/somleng/sms-gateway.git && \
    cd sms-gateway && \
    npm ci && \
    npm run build && \
    package_name=$(npm pkg get name | xargs echo) && \
    package_version=$(npm pkg get version | xargs echo) && \
    echo "$package_name" > package_name.txt && \
    echo "$package_version" > package_version.txt

FROM public.ecr.aws/docker/library/node:current as build-linux
COPY --link --from=build-base /src /src
WORKDIR /src/sms-gateway
RUN package_name=$(cat package_name.txt) && \
    package_version=$(cat package_version.txt) && \
    full_package_name=$package_name-linux-$(arch)-v$package_version && \
    npm run dist $full_package_name

FROM scratch AS export-linux
COPY --link --from=build-linux /src/sms-gateway/build/* .

FROM public.ecr.aws/docker/library/node:current as build-alpine
COPY --link --from=build-base /src /src
WORKDIR /src/sms-gateway
RUN package_name=$(cat package_name.txt) && \
    package_version=$(cat package_version.txt) && \
    full_package_name=$package_name-alpine-$(arch)-v$package_version && \
    npm run dist $full_package_name

FROM scratch AS export-alpine
COPY --link --from=build-alpine /src/sms-gateway/build/* .

FROM public.ecr.aws/docker/library/alpine:latest as build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl grep wget ca-certificates unzip jq

RUN curl -s https://api.github.com/repos/somleng/sms-gateway/releases/latest \
  | jq ".assets[].browser_download_url" \
  | grep "somleng-sms-gateway-alpine-$(arch)-v.*.zip" \
  | tr -d '"' \
  | wget -qi - -O somleng-sms-gateway.zip \
  | echo "downloading..."

RUN unzip somleng-sms-gateway.zip && \
    rm somleng-sms-gateway.zip && \
    chmod +x somleng-sms-gateway

FROM public.ecr.aws/docker/library/alpine:latest

ARG APP_ROOT="/app"
WORKDIR $APP_ROOT
ENV PATH "$PATH:$APP_ROOT"

COPY --from=build $APP_ROOT $APP_ROOT
CMD ["somleng-sms-gateway"]
