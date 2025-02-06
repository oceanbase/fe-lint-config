import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

import { GLOB_TS, GLOB_TSX } from '../globs';
import type {
  OptionsComponentExts,
  OptionsFiles,
  OptionsOverrides,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from '../types';

export function typescript(
  options: OptionsFiles &
    OptionsComponentExts &
    OptionsOverrides &
    OptionsTypeScriptWithTypes = {},
): TypedFlatConfigItem[] {
  const { componentExts = [], overrides = {} } = options;

  const files = options.files ?? [
    GLOB_TS,
    GLOB_TSX,
    ...componentExts.map((ext) => `**/*.${ext}`),
  ];
  const tsconfigPath = options?.tsconfigPath ? options.tsconfigPath : undefined;
  const isTypeAware = !!tsconfigPath;
  const recommendedRule = isTypeAware
    ? [
        ...tseslint.configs.recommendedTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ]
    : [...tseslint.configs.recommended, ...tseslint.configs.stylistic];
  return tseslint.config(
    {
      name: `OB/typescript/parser`,
      files: [GLOB_TS, GLOB_TSX, ...files],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: {
          projectService: isTypeAware
            ? {
                allowDefaultProject: ['./*.js', './*.ts'],
                defaultProject: tsconfigPath,
              }
            : true,
          tsconfigRootDir: process.cwd(),
          extraFileExtensions: componentExts.map((ext) => `.${ext}`), // 额外解析的文件扩展名，比如 .vue
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      // https://stackoverflow.com/questions/78359580/eslint-error-when-enabling-tseslint-type-checked-and-ignoring-the-eslint-config
      // recommendedTypeChecked 需要放在 extends 内
      extends: recommendedRule,
    },
    {
      name: 'OB/typescript/rules',
      files: [GLOB_TS, GLOB_TSX, ...files],
      rules: {
        // typescript eslint 官方推荐关闭此规则，ts 本身做得更好
        'no-undef': 0,
        '@typescript-eslint/no-unused-expressions': 0,
        '@typescript-eslint/no-non-null-asserted-optional-chain': 0, // 禁止使用 ! 修饰可选链
        '@typescript-eslint/no-inferrable-types': 0, // 禁止使用明确的类型声明，如 let foo: string = 'bar';
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'all',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
        '@typescript-eslint/ban-ts-comment': 1, // 禁止使用 @ts-<directive> 注释，如 @ts-ignore、@ts-expect-error 等。
        '@typescript-eslint/no-explicit-any': 1, // 禁止使用 any
        '@typescript-eslint/no-require-imports': 0, // 禁止使用 require 导入模块
        '@typescript-eslint/ban-tslint-comment': 1, // 禁止使用 // tslint:<rule-flag> 注释。
        '@typescript-eslint/no-empty-function': 2, // 禁止空函数

        ...overrides,
      },
    },
    //TODO 可以透出参数支持部分文件关闭 type linting
    // {
    //   files: ['**/*.js'],
    //   extends: [tseslint.configs.disableTypeChecked],
    // },
  ) as TypedFlatConfigItem[];
}
