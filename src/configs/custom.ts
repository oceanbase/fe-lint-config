import type { TypedFlatConfigItem } from '../types';
import { customPlugin } from '../rules/index';
export function customRule(): TypedFlatConfigItem[] {
  return [
    {
      name: 'OB/custom/rules',
      files: ['**/*.{ts,tsx,js,jsx}'],
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: {
        custom: customPlugin,
      },
      rules: {
        'custom/no-single-letter': 'error',
      },
    },
  ];
}
