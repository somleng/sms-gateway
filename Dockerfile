FROM public.ecr.aws/docker/library/node:current AS build-base
WORKDIR "/src"
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y git
RUN git clone https://github.com/somleng/sms-gateway.git && \
    cd sms-gateway && \
    npm ci && \
    npm run build && \
    package_name=$(npm pkg get name | xargs echo) && \
    package_version=$(npm pkg get version | xargs echo) && \
    mkdir -p build && \
    echo "$package_name" > build/package_name.txt && \
    echo "$package_version" > build/package_version.txt

FROM public.ecr.aws/docker/library/node:current as build-linux
COPY --from=build-base /src /src
WORKDIR /src/sms-gateway
RUN package_name=$(cat build/package_name.txt) && \
    package_version=$(cat build/package_version.txt) && \
    full_package_name=$package_name-linux-$(arch)-v$package_version && \
    echo "$full_package_name" > build/full_package_name.txt && \
    npm run dist $full_package_name

FROM scratch AS export-linux
COPY --from=build-linux /src/sms-gateway/build/ /

FROM public.ecr.aws/docker/library/debian:bookworm-slim as build
ARG APP_ROOT="/app"
WORKDIR $APP_ROOT
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl grep wget ca-certificates unzip jq

RUN curl -s https://api.github.com/repos/somleng/sms-gateway/releases/latest \
  | jq ".assets[].browser_download_url" \
  | grep "somleng-sms-gateway-linux-$(arch)-v.*.zip" \
  | tr -d '"' \
  | wget -qi - -O somleng-sms-gateway.zip \
  | echo "downloading..."

RUN unzip somleng-sms-gateway.zip && \
    rm somleng-sms-gateway.zip && \
    chmod +x somleng-sms-gateway

FROM public.ecr.aws/docker/library/debian:bookworm-slim
ARG APP_ROOT="/app"
WORKDIR $APP_ROOT

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y wget libatomic1

ENV PATH "$PATH:$APP_ROOT"
COPY --link --from=build $APP_ROOT $APP_ROOT
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD wget --server-response --spider --quiet http://localhost:3210 2>&1 | grep '200 OK' > /dev/null
CMD ["somleng-sms-gateway"]
