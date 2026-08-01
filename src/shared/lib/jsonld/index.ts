import type {Dictionary, Locale} from '@shared/i18n';
import {localizePath} from '@shared/i18n';

type JsonLd = Record<string, unknown>;

export function softwareApplication(t: Dictionary, locale: Locale, siteUrl: string): JsonLd {
    const offer = (name: string, price: string) => ({
        '@type': 'Offer',
        name,
        price,
        priceCurrency: 'USD'
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'TraceIron',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'iOS 17.0 or later, watchOS 10.0 or later',
        url: `${siteUrl}${localizePath('/', locale)}`,
        description: t.meta.home.description,
        offers: [
            offer('Premium Monthly', t.pricing.plans.monthly.price),
            offer('Premium Annual', t.pricing.plans.annual.price),
            offer('Premium Lifetime', t.pricing.plans.lifetime.price)
        ]
    };
}

/**
 * FAQPage cuyo texto coincide EXACTAMENTE con el visible.
 * Se deriva del mismo array que renderiza Faq.astro, así que la divergencia
 * —penalizada por Google— es imposible por construcción.
 */
export function faqPage(t: Dictionary): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: t.faq.items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a
            }
        }))
    };
}

/** Organization con el logo. */
export function organization(siteUrl: string): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'TraceIron',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/logo.png`
    };
}

/** WebSite en la home. */
export function website(t: Dictionary, locale: Locale, siteUrl: string): JsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TraceIron',
        url: `${siteUrl}${localizePath('/', locale)}`,
        inLanguage: locale,
        description: t.meta.home.description
    };
}
