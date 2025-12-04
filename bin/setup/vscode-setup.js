import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import { confirm, log } from '../utils/cli.js';
import { generateVSCodeConfig } from '../generators/vscode.js';

/**
 * 合并 VSCode 配置
 * @param {Object} existing - 现有配置
 * @param {Object} newConfig - 新配置
 * @returns {Object} 合并后的配置
 */
function mergeVSCodeConfig(existing, newConfig) {
  const merged = { ...existing };

  // 合并顶层设置
  Object.assign(merged, newConfig);

  // 合并 codeActionsOnSave
  if (newConfig['editor.codeActionsOnSave']) {
    if (!merged['editor.codeActionsOnSave']) {
      merged['editor.codeActionsOnSave'] = {};
    }
    Object.assign(
      merged['editor.codeActionsOnSave'],
      newConfig['editor.codeActionsOnSave'],
    );
  }

  // 合并语言特定配置（如 [javascript], [typescript] 等）
  for (const key in newConfig) {
    if (key.startsWith('[') && key.endsWith(']')) {
      if (!merged[key]) {
        merged[key] = {};
      }
      Object.assign(merged[key], newConfig[key]);
    }
  }

  return merged;
}

/**
 * 设置 VSCode 配置
 * @param {Object} options - 配置选项
 * @param {boolean} options.useESLint - 是否使用 ESLint
 * @param {boolean} options.useOxlint - 是否使用 Oxlint
 * @param {boolean} options.useStylelint - 是否使用 Stylelint
 * @param {boolean} options.usePrettier - 是否使用 Prettier
 * @returns {Promise<boolean>} 是否成功生成配置
 */
export async function setupVSCodeConfig(options) {
  const { useESLint, useOxlint, useStylelint, usePrettier } = options;

  const addVSCode = await confirm('\n是否生成 VSCode 配置文件?');

  if (!addVSCode) {
    return false;
  }

  if (!existsSync('.vscode')) {
    mkdirSync('.vscode');
  }

  // 读取现有配置（如果存在）
  let existingConfig = {};
  if (existsSync('.vscode/settings.json')) {
    try {
      const existingContent = readFileSync('.vscode/settings.json', 'utf-8');
      existingConfig = JSON.parse(existingContent);
    } catch (error) {
      log('⚠️  读取现有 VSCode 配置失败，将创建新配置', 'yellow');
    }
  }

  // 生成新配置
  const newConfig = JSON.parse(
    generateVSCodeConfig({
      eslint: useESLint,
      oxlint: useOxlint,
      stylelint: useStylelint,
      prettier: usePrettier,
    }),
  );

  // 合并配置
  const mergedConfig = mergeVSCodeConfig(existingConfig, newConfig);

  writeFileSync(
    '.vscode/settings.json',
    JSON.stringify(mergedConfig, null, 2),
  );
  log('✓ VSCode 配置文件已生成 (.vscode/settings.json)', 'green');
  return true;
}

