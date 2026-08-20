FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

FROM base AS build
WORKDIR /app
COPY . /app

RUN corepack enable
RUN apk add --no-cache python3 alpine-sdk

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

RUN pnpm deploy --filter=@imput/cobalt-api --prod /prod/api

FROM base AS api
WORKDIR /app

RUN apk add --no-cache python3 py3-pip \
    && python3 -m venv /opt/python-tools \
    && /opt/python-tools/bin/pip install --no-cache-dir \
        "yt-dlp[default,curl-cffi]==2026.8.19" \
        "bgutil-ytdlp-pot-provider==1.3.1"

ENV VIMEO_IMPERSONATE_PYTHON="/opt/python-tools/bin/python"
ENV YOUTUBE_YTDLP_PATH="/opt/python-tools/bin/yt-dlp"

COPY --from=build --chown=node:node /prod/api /app
COPY --from=build --chown=node:node /app/.git /app/.git

USER node

EXPOSE 5120
CMD [ "node", "src/cobalt" ]
