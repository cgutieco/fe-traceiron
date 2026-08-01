import en from './en.json';
import es from './es.json';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
    en,
    es: es as Dictionary
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function useTranslations(locale: Locale): Dictionary {
    return dictionaries[locale];
}

export function getLocaleFromUrl(url: URL): Locale {
    const [, first] = url.pathname.split('/');
    return first === 'es' ? 'es' : DEFAULT_LOCALE;
}

export function stripLocale(pathname: string): string {
    if (pathname === '/es' || pathname === '/es/') return '/';
    if (pathname.startsWith('/es/')) return pathname.slice(3);
    return pathname;
}

export function localizePath(canonicalPath: string, locale: Locale): string {
    const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    if (locale === DEFAULT_LOCALE) return path;
    return path === '/' ? '/es/' : `/es${path}`;
}

/** Enlaces recíprocos de [I18N-04], incluido x-default. */
export function alternatesFor(canonicalPath: string, siteUrl: string) {
    const base = siteUrl.replace(/\/$/, '');
    return {
        en: `${base}${localizePath(canonicalPath, 'en')}`,
        es: `${base}${localizePath(canonicalPath, 'es')}`,
        xDefault: `${base}${localizePath(canonicalPath, 'en')}`
    };
}

/** Etiqueta BCP-47 para og:locale. */
export function ogLocale(locale: Locale): string {
    return locale === 'es' ? 'es_ES' : 'en_US';
}

/**
 * [I18N-03] Resolución canónica de idioma:
 *
 *   si cookie ti_lang ∈ {en, es}                          → usar ese valor
 *   si no, primer idioma de Accept-Language empieza por es → es
 *   en cualquier otro caso                                 → en   ← fallback
 *
 * Usada por el middleware para `/` y por las rutas de compartir, que por
 * [RTE-04] no llevan prefijo de idioma y resuelven el suyo en el servidor.
 */
export function resolveLocale(acceptLanguage: string | null, cookieValue?: string | null): Locale {
    if (cookieValue === 'en' || cookieValue === 'es') return cookieValue;

    const first = (acceptLanguage ?? '').split(',')[0]?.split(';')[0]?.trim().toLowerCase();

    return first?.startsWith('es') ? 'es' : DEFAULT_LOCALE;
}

/** Interpolación mínima de marcadores `{clave}`. No hay motor de plantillas. */
export function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? String(values[key]) : match
    );
}
