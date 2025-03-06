import importPlugin from 'eslint-plugin-import';

import type { OptionsOverrides, TypedFlatConfigItem } from '../types';

export function imports(options: OptionsOverrides = {}): TypedFlatConfigItem[] {
  const { overrides = {} } = options;
  return [
    {
      name: 'OB/imports/rules',
      ...importPlugin.flatConfigs.recommended,
      ...importPlugin.flatConfigs.typescript,
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
          },
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            paths: ['src'],
          },
        },
      },

      rules: {
        'import/order': [
          'error',
          {
            groups: [
              'builtin',
              'external',
              'internal',
              'parent',
              'sibling',
              'index',
            ],
            'newlines-between': 'always',
            pathGroups: [
              {
                pattern: '@/**',
                group: 'external',
                position: 'after',
              },
            ],
          },
        ],
        // https://github.com/import-js/eslint-plugin-import/issues/3079
        // 目前 unusedExports 规则有官方 bug，暂不支持
        // 'import/no-unused-modules': [
        //   1,
        //   { unusedExports: true, missingExports: true },
        // ],
        // 循环引用问题检查较为耗时，仅建议在 CI/push 时执行，不建议一直开启
        // 'import/no-cycle': 2,

        'import/named': 0,
        'import/namespace': 0,
        'import/no-extraneous-dependencies': 0,
        'import/no-named-as-default': 0,
        'import/no-named-as-default-member': 0,
        'import/default': 0,

        ...overrides,
      },
    },
  ] as TypedFlatConfigItem[];
}
