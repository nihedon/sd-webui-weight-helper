import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from 'eslint-config-prettier';

export default defineConfig([
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: globals.browser,
        },
        rules: {
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
        },
    },
    prettier,
]);
