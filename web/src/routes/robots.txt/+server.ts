import env from "$lib/env";

export function GET() {
    const sitemap = env.HOST ? `\nSitemap: https://${env.HOST}/sitemap.xml` : "";

    return new Response(`User-agent: *\nAllow: /${sitemap}\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}

export const prerender = true;
