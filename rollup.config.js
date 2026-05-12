import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import typescript from '@rollup/plugin-typescript';

// 所有外部依赖
const externalDeps = [
  // ESLint 相关
  'eslint',
  'eslint-flat-config-utils',
  '@eslint/js',
  '@typescript-eslint/parser',
  'typescript-eslint',
  'eslint-plugin-import',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-prettier',
  'eslint-plugin-prettier/recommended',
  'eslint-config-prettier',
  'prettier',
  // Stylelint 相关
  'stylelint',
  'stylelint-config-standard',
  'stylelint-config-recommended-less',
  'stylelint-less',
  'postcss-less',
];

const config = defineConfig([
  // ESLint 独立入口
  {
    input: 'src/eslint.ts',
    output: [
      {
        file: 'dist/eslint.js',
        format: 'esm',
      },
      {
        file: 'dist/eslint.cjs',
        format: 'cjs',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: externalDeps,
  },

  // Stylelint 独立入口
  {
    input: 'src/stylelint.ts',
    output: [
      {
        file: 'dist/stylelint.js',
        format: 'esm',
      },
      {
        file: 'dist/stylelint.cjs',
        format: 'cjs',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: externalDeps,
  },

  // ESLint Factory 模块（供主入口延迟加载）
  {
    input: 'src/eslintFactory.ts',
    output: [
      {
        file: 'dist/eslintFactory.cjs',
        format: 'cjs',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: externalDeps,
  },

  // Configs 模块（供主入口延迟加载）
  {
    input: 'src/configs/index.ts',
    output: [
      {
        file: 'dist/configs.cjs',
        format: 'cjs',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: externalDeps,
  },

  // Design Tokens 独立入口
  {
    input: 'src/design-tokens/index.ts',
    output: [
      {
        file: 'dist/design-tokens/index.js',
        format: 'esm',
      },
      {
        file: 'dist/design-tokens/index.cjs',
        format: 'cjs',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: externalDeps,
  },

  // 主入口 - CJS 格式
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        exports: 'named',
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: [
      ...externalDeps,
      // 把这些模块也标记为外部，让 require 在运行时加载
      './eslintFactory.cjs',
      './configs.cjs',
    ],
  },

  // 主入口 - ESM 格式
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        banner: `import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);`,
      },
    ],
    plugins: [typescript({ noEmit: false, declaration: false, declarationMap: false }), commonjs()],
    external: [...externalDeps, './eslintFactory.cjs', './configs.cjs'],
  },

  // 生成 .d.ts 文件
  {
    input: 'src/eslint.ts',
    output: {
      file: 'dist/eslint.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
  {
    input: 'src/stylelint.ts',
    output: {
      file: 'dist/stylelint.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
  {
    input: 'src/design-tokens/index.ts',
    output: {
      file: 'dist/design-tokens/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
]);

export default config;
