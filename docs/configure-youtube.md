# configure youtube processing

savepop uses yt-dlp for youtube extraction. current youtube bot checks can require both an authenticated browser cookie jar and content-bound proof-of-origin tokens.

## cookie file

the default compose configuration uses Cobalt's `cookies.json` format. its `youtube` entry must contain the raw browser cookie header. Netscape `cookies.txt` exports are also accepted when `YOUTUBE_COOKIES_PATH` points to one. never commit either file.

the api image runs as uid `1000`. on a linux host, secure the file while allowing the container to read it:

```sh
chown 1000:1000 cookies.json
chmod 600 cookies.json
```

configure the api service with:

```yaml
environment:
    YOUTUBE_COOKIES_PATH: /run/secrets/youtube-cookies.json
    YOUTUBE_POT_PROVIDER_URL: http://youtube-pot-provider:4416
volumes:
    - type: bind
      source: ./cookies.json
      target: /run/secrets/youtube-cookies.json
      read_only: true
      bind:
          create_host_path: false
```

the `create_host_path: false` setting makes compose fail clearly if the source file is missing instead of silently creating a directory.

## proof-of-origin provider

run the maintained bgutil provider on the same docker network as the api:

```yaml
youtube-pot-provider:
    image: brainicism/bgutil-ytdlp-pot-provider:1.3.1
    init: true
    restart: unless-stopped
```

the provider does not need a public port. yt-dlp reaches it through compose DNS, and both containers use the same server egress IP.

## deploy

```sh
docker compose up -d --build
docker compose logs -f youtube-pot-provider api
```

cookies and proof-of-origin tokens can improve reliability, but they cannot guarantee access from an IP that youtube has blocked. refresh the cookie export if youtube invalidates the browser session.
