export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? 'https://traceiron.com').replace(
    /\/$/,
    ''
);

export const APPSTORE_URL: string = import.meta.env.PUBLIC_APPSTORE_URL ?? '';

export const APPSTORE_ID: string = import.meta.env.PUBLIC_APPSTORE_ID ?? '';

export const SUPPORT_EMAIL = 'support@traceiron.com';

/** Remitente del formulario de soporte. El dominio debe tener un remitente aprobado en OCI Email Delivery. */
export const SUPPORT_FORM_SENDER_EMAIL = 'no-reply@traceiron.com';

export const TURNSTILE_SITE_KEY: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '';

export const APP_SCHEME: string = import.meta.env.PUBLIC_APP_SCHEME ?? '';

export const OG_IMAGE = `${SITE_URL}/og/traceiron-og.jpg`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** URL absoluta a partir de una ruta del sitio. */
export function absolute(path: string): string {
    return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
