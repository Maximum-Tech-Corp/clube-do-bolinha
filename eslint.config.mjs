import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Restringe arquivos com JSX apenas a extensões .tsx
      'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],

      // Permite múltiplos exports nomeados por módulo (padrão comum em Next.js)
      'import/prefer-default-export': 'off',

      // Desabilitado para compatibilidade com campos snake_case vindos da API
      camelcase: 'off',

      // Permite referenciar variáveis antes de declará-las (necessário com tipos TypeScript)
      'no-use-before-define': 'off',

      // Proíbe extensão de arquivo explícita em imports .ts e .tsx
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never' },
      ],
    },
  },

  // Integração com Prettier: aplica as regras do prettier como erros de lint
  // e desabilita regras do ESLint que conflitam com a formatação do Prettier.
  // Deve ser o último item do array para garantir a sobreposição correta.
  prettierRecommended,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '**/*.js',
    'node_modules/**',
  ]),
]);

export default eslintConfig;
