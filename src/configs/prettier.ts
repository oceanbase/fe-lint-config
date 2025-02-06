import eslintConfigPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

import type { OptionsOverrides, TypedFlatConfigItem } from '../types';

export function _prettier(
  options: OptionsOverrides = {},
): TypedFlatConfigItem[] {
  const { overrides = {} } = options;
  return [
    {
      name: 'OB/prettier',
      plugins: [prettier],
    },
    {
      name: 'OB/prettier/recommended',
      ...eslintConfigPrettier,
      ...eslintPluginPrettierRecommended,
    },
    {
      name: 'OB/prettier/overrides',
      rules: {
        'prettier/prettier': [
          'error',
          {
            singleQuote: true,
            // parser: 'flow',
            proseWrap: 'never',
            semi: true,
            tabWidth: 2,
            trailingComma: 'all',
            ...overrides,
          },
        ],
      },
    },
  ] as TypedFlatConfigItem[];
}
