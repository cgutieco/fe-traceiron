import {test, expect} from 'vitest';

import {
    DEFAULT_LOCALE,
    LOCALES,
    alternatesFor,
    getLocaleFromUrl,
    interpolate,
    isLocale,
    localizePath,
    ogLocale,
    resolveLocale,
    stripLocale,
    useTranslations
} from './index.ts';

test('isLocale acepta solo en/es', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('es')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
});

test('el fallback obligatorio es en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect([...LOCALES]).toEqual(['en', 'es']);
});

test('useTranslations devuelve un diccionario distinto por locale', () => {
    const en = useTranslations('en');
    const es = useTranslations('es');
    expect(en).not.toBe(es);
    expect(typeof en).toBe('object');
    expect(typeof es).toBe('object');
});

test('getLocaleFromUrl detecta /es/... como es', () => {
    expect(getLocaleFromUrl(new URL('https://traceiron.com/es/privacy'))).toBe('es');
    expect(getLocaleFromUrl(new URL('https://traceiron.com/es/'))).toBe('es');
    expect(getLocaleFromUrl(new URL('https://traceiron.com/es'))).toBe('es');
});

test('getLocaleFromUrl cae a en para cualquier otra ruta', () => {
    expect(getLocaleFromUrl(new URL('https://traceiron.com/privacy'))).toBe('en');
    expect(getLocaleFromUrl(new URL('https://traceiron.com/'))).toBe('en');
    expect(getLocaleFromUrl(new URL('https://traceiron.com/estudio'))).toBe('en');
});

test('stripLocale quita el prefijo /es sin tocar la ruta canónica', () => {
    expect(stripLocale('/es/privacy')).toBe('/privacy');
    expect(stripLocale('/es')).toBe('/');
    expect(stripLocale('/es/')).toBe('/');
    expect(stripLocale('/privacy')).toBe('/privacy');
    expect(stripLocale('/')).toBe('/');
});

test('el inglés nunca lleva prefijo', () => {
    expect(localizePath('/privacy', 'en')).toBe('/privacy');
    expect(localizePath('/', 'en')).toBe('/');
});

test('localizePath antepone /es para español, incluida la home', () => {
    expect(localizePath('/privacy', 'es')).toBe('/es/privacy');
    expect(localizePath('/', 'es')).toBe('/es/');
});

test('localizePath normaliza una ruta canónica sin barra inicial', () => {
    expect(localizePath('privacy', 'en')).toBe('/privacy');
    expect(localizePath('privacy', 'es')).toBe('/es/privacy');
});

test('alternatesFor genera enlaces recíprocos con x-default en inglés', () => {
    const alt = alternatesFor('/privacy', 'https://traceiron.com/');
    expect(alt.en).toBe('https://traceiron.com/privacy');
    expect(alt.es).toBe('https://traceiron.com/es/privacy');
    expect(alt.xDefault).toBe(alt.en);
});

test('alternatesFor tolera un siteUrl con barra final', () => {
    const alt = alternatesFor('/', 'https://traceiron.com/');
    expect(alt.en).toBe('https://traceiron.com/');
    expect(alt.es).toBe('https://traceiron.com/es/');
});

test('ogLocale mapea a etiquetas BCP-47', () => {
    expect(ogLocale('en')).toBe('en_US');
    expect(ogLocale('es')).toBe('es_ES');
});

test('resolveLocale prioriza la cookie ti_lang sobre Accept-Language', () => {
    expect(resolveLocale('en-US,en;q=0.9', 'es')).toBe('es');
    expect(resolveLocale('es-ES', 'en')).toBe('en');
});

test('resolveLocale ignora una cookie con valor inválido', () => {
    expect(resolveLocale('es-ES,es;q=0.9', 'fr')).toBe('es');
    expect(resolveLocale('es-ES', null)).toBe('es');
});

test('resolveLocale usa el primer idioma de Accept-Language sin cookie', () => {
    expect(resolveLocale('es-MX,es;q=0.9,en;q=0.8', null)).toBe('es');
    expect(resolveLocale('en-GB,en;q=0.9', null)).toBe('en');
});

test('resolveLocale cae a en cuando no hay cookie ni Accept-Language', () => {
    expect(resolveLocale(null, null)).toBe('en');
    expect(resolveLocale('', undefined)).toBe('en');
});

test('resolveLocale cae a en ante un idioma no soportado', () => {
    expect(resolveLocale('fr-FR,fr;q=0.9', null)).toBe('en');
});

test('interpolate sustituye marcadores {clave} conocidos', () => {
    expect(interpolate('Hola {name}, tienes {count} rutinas', {name: 'Cesar', count: 3})).toBe(
        'Hola Cesar, tienes 3 rutinas'
    );
});

test('interpolate deja intacto un marcador sin valor provisto', () => {
    expect(interpolate('Hola {name}', {})).toBe('Hola {name}');
});

test('interpolate no toca texto sin marcadores', () => {
    expect(interpolate('Texto plano', {unused: 'x'})).toBe('Texto plano');
});
