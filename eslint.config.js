import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  // Base para todo JavaScript do projeto.
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // `const { removido, ...resto } = obj` é a forma usual de tirar uma chave.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },

  // App React: regras dos hooks (inclui as do React Compiler), Fast Refresh e acessibilidade.
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    rules: {
      // O ESLint 9 não vê o uso de componentes em JSX; sem isto, todo import de componente
      // seria apontado como não usado.
      'react/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Arquitetura: domain/ é JavaScript puro.
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                '**/components/**',
                '**/features/**',
                '**/services/**',
              ],
              message:
                'domain/ é JavaScript puro: não pode importar React, UI, features ou serviços.',
            },
          ],
        },
      ],
    },
  },

  // Arquitetura: uma feature não importa de outra.
  {
    files: ['src/features/*/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // "../outra-feature/..." ou qualquer caminho que passe por features/.
              regex: '^\\.\\./[^./]|/features/',
              message:
                'Uma feature não importa de outra feature. Extraia o que é compartilhado para components/, domain/ ou services/.',
            },
          ],
        },
      ],
    },
  },

  // Provedores de contexto exportam componente e hook juntos, de propósito.
  {
    files: [
      'src/context/**',
      'src/components/ui/ScreenPortal.jsx',
      'src/components/ui/Toast.jsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Código que roda no Node: servidor do Vite, scripts e configurações.
  {
    files: ['server/**', 'scripts/**', 'src/test/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
