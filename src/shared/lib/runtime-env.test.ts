import {test, expect} from 'vitest';

(
    globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
).__TRACEIRON_CF_ENV__ = {};

const {getRuntimeEnv} = await import('./runtime-env.ts');

function setEnv(overrides: Record<string, string | undefined> = {}) {
    const target = (
        globalThis as unknown as {__TRACEIRON_CF_ENV__: Record<string, string | undefined>}
    ).__TRACEIRON_CF_ENV__;
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, overrides);
}

test('getRuntimeEnv refleja las variables del entorno de Workers', () => {
    setEnv({FOO: 'bar'});
    expect(getRuntimeEnv().FOO).toBe('bar');
});

test('getRuntimeEnv devuelve undefined para claves ausentes', () => {
    setEnv({});
    expect(getRuntimeEnv().MISSING).toBeUndefined();
});
