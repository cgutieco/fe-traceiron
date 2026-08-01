import {defineMiddleware} from 'astro:middleware';
import {resolveLocale} from '@shared/i18n';
import {LANG_COOKIE_NAME} from '@features/language-switch';

const BOT_PATTERN =
    /Googlebot|Bingbot|DuckDuckBot|Applebot|facebookexternalhit|Twitterbot|Slackbot|WhatsApp/i;

export const onRequest = defineMiddleware((context, next) => {
    const {pathname} = context.url;

    if (pathname !== '/') return next();

    const userAgent = context.request.headers.get('user-agent') ?? '';
    if (BOT_PATTERN.test(userAgent)) return next();

    const cookie = context.cookies.get(LANG_COOKIE_NAME)?.value ?? null;
    const locale = resolveLocale(context.request.headers.get('accept-language'), cookie);

    if (locale !== 'es') return next();

    return new Response(null, {
        status: 302,
        headers: {
            Location: '/es/',
            Vary: 'Accept-Language, Cookie',
            'Cache-Control': 'no-store'
        }
    });
});
