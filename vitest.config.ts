import { configDefaults, defineConfig } from 'vitest/config';

const sec = (s: number): number => s * 1000;

export default defineConfig({
    test: {
        include: ['test/**/*.ts'],
        exclude: [...configDefaults.exclude, '**/helpers/**'],
        testTimeout: sec(30),
        watchExclude: [
            ...configDefaults.watchExclude,
            'test/{fixtures,tmp}/**',
        ],
    },
});
