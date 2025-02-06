import { OBEslintCfg } from '@oceanbase/lint-config';

// 如果是引用 ./src/index 需要使用 eslint.config.ts
/**
 * 如果是使用 ts，vscode eslint 插件需要配置
 * "eslint.options": { "flags": ["unstable_ts_config"] },
  "eslint.lintTask.options": "--flag unstable_ts_config ."
  eslint 命令："eslint --flag unstable_ts_config .",
 */
export default OBEslintCfg(
  {
    react: true,
    typescript: {
      // tsconfigPath: './tsconfig.json',
      overrides: {
        // '@typescript-eslint/consistent-indexed-object-style': 'off',
        // '@typescript-eslint/no-explicit-any': 'off',
        // '@typescript-eslint/no-inferrable-types': 'off',
        // '@typescript-eslint/no-duplicate-enum-values': 'off',
      },
    },
    prettier: {},
  },
  // {
  //   name: 'OB/custom/rules',
  //   files: ['**/*.{ts,tsx,js,jsx}'],
  //   languageOptions: {
  //     ecmaVersion: 'latest',
  //     sourceType: 'module',
  //   },
  //   rules: {
  //     'no-undef': 'error',
  //   },
  // },
);
