import { configDefaults, defineConfig } from 'vitest/config';

const m = (minutes: number): number => minutes * 60 * 1000;

export default defineConfig({
    test: {
        include: ['test/**/*.ts'],
        exclude: [...configDefaults.exclude, '**/helpers/**'],
        deps: {
            inline: ['vitest-mock-process'],
        },
        testTimeout: m(5),
        hookTimeout: m(5),
        watchExclude: [
            ...configDefaults.watchExclude,
            'test/{fixtures,tmp}/**',
        ],
    },
});
