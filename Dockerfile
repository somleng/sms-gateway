FROM public.ecr.aws/docker/library/node:current AS build-linux
WORKDIR /src/sms-gateway

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN package_name=$(npm pkg get name | xargs echo) && \
    package_version=$(npm pkg get version | xargs echo) && \
    full_package_name=$package_name-linux-$(arch)-v$package_version && \
    npm run dist $full_package_name

FROM scratch AS export-linux
COPY --from=build-linux /src/sms-gateway/build/ /

FROM public.ecr.aws/docker/library/debian:bookworm-slim
ARG APP_ROOT="/app"
WORKDIR $APP_ROOT

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y wget libatomic1 && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p $APP_ROOT

COPY --link --from=export-linux /somleng-sms-gateway-linux-* $APP_ROOT/
COPY --link docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mv $APP_ROOT/somleng-sms-gateway-linux-* $APP_ROOT/somleng-sms-gateway && \
    chmod +x $APP_ROOT/somleng-sms-gateway /usr/local/bin/docker-entrypoint.sh

ENV PATH="$PATH:$APP_ROOT"
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD wget --server-response --spider --quiet http://localhost:3210 2>&1 | grep '200 OK' > /dev/null
ENTRYPOINT ["docker-entrypoint.sh"]
