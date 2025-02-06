import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import ts from 'rollup-plugin-typescript2';

const config = defineConfig([
  {
    input: ['src/index.ts'],
    output: [
      {
        dir: 'dist',
        format: 'esm',
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
      },
    ],
    plugins: [ts(), commonjs()],
  },

  // 生成 .d.ts 文件的配置
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'esm',
    },
    plugins: [dts()],
  },
]);

export default config;
