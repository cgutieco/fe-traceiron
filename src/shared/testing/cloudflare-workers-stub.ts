export const env: Record<string, string | undefined> = new Proxy(
    {},
    {
        get(_target, prop: string) {
            const globalEnv = (
                globalThis as unknown as {__TRACEIRON_CF_ENV__?: Record<string, string | undefined>}
            ).__TRACEIRON_CF_ENV__;
            if (globalEnv && prop in globalEnv) {
                return globalEnv[prop];
            }
            return process.env[prop];
        }
    }
);
