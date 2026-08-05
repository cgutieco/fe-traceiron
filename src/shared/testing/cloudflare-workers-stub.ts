export const env: Record<string, string | undefined> = new Proxy(
    {},
    {
        get(_target, prop: string) {
            const globalEnv = (
                globalThis as unknown as {__TRACEIRON_CF_ENV__?: Record<string, string | undefined>}
            ).__TRACEIRON_CF_ENV__;
            // Una vez que un test inicializó __TRACEIRON_CF_ENV__ (aunque sea con {}),
            // es la única fuente de verdad — sin fallback a process.env. Si no, un
            // .env local con secretos reales filtraría valores a tests que
            // deliberadamente simulan "esta variable no está configurada".
            if (globalEnv) return globalEnv[prop];
            return process.env[prop];
        }
    }
);
