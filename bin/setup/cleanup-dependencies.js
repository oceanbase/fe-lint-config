import { detectESLintPrettierDependencies, uninstallDependencies } from '../utils/dependencies.js';
import { confirm, log } from '../utils/cli.js';

/**
 * 清理 ESLint/Prettier 依赖（仅在只使用 oxlint 时）
 * @param {Object} options - 配置选项
 * @param {boolean} options.useOxlint - 是否使用 Oxlint
 * @param {boolean} options.useESLint - 是否使用 ESLint
 * @returns {Promise<string[]|null>} 卸载的包列表，如果没有卸载则返回 null
 */
export async function cleanupDependencies(options) {
  const { useOxlint, useESLint } = options;

  // 仅在只使用 oxlint 时询问
  if (!useOxlint || useESLint) {
    return null;
  }

  const eslintPrettierPackages = detectESLintPrettierDependencies();
  // 过滤掉已经处理过的 prettier 相关包
  const packagesToCheck = eslintPrettierPackages.filter(
    (pkg) =>
      ![
        'prettier',
        'eslint-config-prettier',
        'eslint-plugin-prettier',
      ].includes(pkg),
  );

  if (packagesToCheck.length === 0) {
    return null;
  }

  log(
    `\n📦 检测到以下 ESLint 相关依赖: ${packagesToCheck.join(', ')}`,
    'cyan',
  );
  const shouldUninstall = await confirm(
    '是否卸载这些依赖? (推荐，因为已选择使用 Oxlint)',
  );

  if (shouldUninstall) {
    uninstallDependencies(packagesToCheck);
    return packagesToCheck; // 返回卸载的包列表
  }

  return null;
}

