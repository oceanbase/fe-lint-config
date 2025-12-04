import { existsSync, readFileSync, writeFileSync } from 'fs';

import { confirm, log } from '../utils/cli.js';

/**
 * 设置 package.json 中的 lint 脚本
 * @param {Object} options - 配置选项
 * @param {boolean} options.useESLint - 是否使用 ESLint
 * @param {boolean} options.useOxlint - 是否使用 Oxlint
 * @param {boolean} options.useStylelint - 是否使用 Stylelint
 * @returns {Promise<boolean>} 是否成功添加脚本
 */
export async function setupScripts(options) {
  const { useESLint, useOxlint, useStylelint } = options;

  if (!existsSync('package.json')) {
    return false;
  }

  const addScripts = await confirm('\n是否在 package.json 中添加 lint 脚本?');

  if (!addScripts) {
    return false;
  }

  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  if (useESLint) {
    pkg.scripts.lint = 'eslint .';
    pkg.scripts['lint:fix'] = 'eslint . --fix';
  }

  if (useOxlint) {
    pkg.scripts['lint:oxlint'] = 'oxlint';
    pkg.scripts['lint:oxlint:fix'] = 'oxlint --fix';
  }

  if (useESLint && useOxlint) {
    pkg.scripts.lint = 'oxlint && eslint .';
  }

  if (useStylelint) {
    pkg.scripts['lint:css'] = "stylelint '**/*.{css,less}'";
    pkg.scripts['lint:fix:css'] = "stylelint '**/*.{css,less}' --fix";
  }

  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  log('✓ package.json 脚本已添加', 'green');
  return true;
}

