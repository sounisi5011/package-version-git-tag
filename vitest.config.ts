import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.ts'],
        exclude: [...configDefaults.exclude, '**/helpers/**'],
        watchExclude: [
            ...configDefaults.watchExclude,
            'test/{fixtures,tmp}/**',
        ],
    },
});
