import type { Plugin } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

const m = (minutes: number): number => minutes * 60 * 1000;

/**
 * On older Node.js (Node.js less than 14.17, or Node.js less than 15.3), Vitest does not convert file paths with extension ".js" to ".ts".
 * This tiny plugin fixes that.
 */
const fixTSImport: Plugin = {
    name: 'vite-fix-typescript-js-imports',
    async resolveId(source, importer, options) {
        // Check if the importer is TypeScript file
        if (!/\.[cm]?ts$/.test(importer ?? '')) return;
        // Check if the file extension is ".js"
        const match = /^([^\0]*\.[cm]?)js$/.exec(source);
        if (typeof match?.[1] !== 'string') return;
        // Replace the file extension ".js" with ".ts" and resolve the new path
        return await this.resolve(`${match[1]}ts`, importer, {
            ...options,
            skipSelf: true,
        });
    },
};

export default defineConfig({
    plugins: [fixTSImport],
    test: {
        include: ['test/**/*.ts'],
        exclude: [...configDefaults.exclude, '**/helpers/**'],
        deps: {
            inline: ['vitest-mock-process'],
        },
        testTimeout: m(5),
        hookTimeout: m(5),
    },
});
