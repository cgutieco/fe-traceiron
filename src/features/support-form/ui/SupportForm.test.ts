import {test, expect} from 'vitest';
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import SupportForm from './SupportForm.astro';

const labels = {
    nameLabel: 'Name (optional)',
    namePlaceholder: 'Jane Doe',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    messageLabel: 'How can we help?',
    messagePlaceholder: 'Describe the issue…',
    submit: 'Send message',
    submitting: 'Sending…',
    success: 'Thanks — we got your message.',
    errors: {
        bad_request: 'Something went wrong. Please try again.',
        captcha_failed: "We couldn't verify you're human. Please try again.",
        mail_failed: "We couldn't send your message. Please try again later.",
        name_too_long: 'Name is too long.',
        email_required: 'Email is required.',
        email_invalid_format: 'Enter a valid email address.',
        message_required: 'Please describe how we can help.',
        message_too_short: 'Please add a bit more detail.',
        message_too_long: 'Message is too long.',
        generic: 'Something went wrong. Please try again.'
    }
};

test('renderiza los tres campos, el widget de Turnstile y el botón de envío', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SupportForm, {props: {labels}});

    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="message"');
    expect(html).toContain('type="email"');
    expect(html).toContain('required');
    expect(html).toContain('class="ti-support-form__captcha cf-turnstile"');
    expect(html).toContain('Send message');
});

test('serializa las etiquetas traducidas en data-i18n para el script cliente', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SupportForm, {props: {labels}});

    expect(html).toContain('data-endpoint="/api/support"');
    expect(html).toContain('Enter a valid email address.');
});

test('los mensajes de error por campo empiezan ocultos', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SupportForm, {props: {labels}});

    expect(html).toContain('data-error-for="email"');
    expect(html).toMatch(/data-error-for="email"[^>]*hidden/);
});
