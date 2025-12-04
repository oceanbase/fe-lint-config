import { log } from '../utils/cli.js';

/**
 * 显示完成消息和使用说明
 * @param {Object} options - 配置选项
 * @param {boolean} options.useESLint - 是否使用 ESLint
 * @param {boolean} options.useOxlint - 是否使用 Oxlint
 * @param {boolean} options.useStylelint - 是否使用 Stylelint
 * @param {boolean} options.usePrettier - 是否使用 Prettier
 * @param {boolean} options.migratedToOxfmt - 是否迁移到 oxfmt
 * @param {boolean} options.addVSCode - 是否生成了 VSCode 配置
 * @param {Object|null} options.oxlintSummary - Oxlint 配置汇总信息
 */
export function showCompletionMessage(options) {
  const {
    useESLint,
    useOxlint,
    useStylelint,
    usePrettier,
    migratedToOxfmt,
    addVSCode,
    oxlintSummary,
  } = options;

  log('\n✨ 配置完成!', 'green');
  log('='.repeat(50), 'cyan');

  if (useESLint) {
    log('\n📋 ESLint 使用说明:', 'bright');
    log('  运行检查: npm run lint', 'blue');
    log('  自动修复: npm run lint:fix', 'blue');
  }

  if (useOxlint) {
    log('\n📋 Oxlint 使用说明:', 'bright');
    log('  运行检查: npm run lint:oxlint', 'blue');
    log('  自动修复: npm run lint:oxlint:fix', 'blue');

    // 显示迁移结果汇总
    if (oxlintSummary) {
      log('\n📋 迁移结果汇总:', 'bright');
      if (oxlintSummary.configFiles.length > 0) {
        log('  生成配置文件:', 'cyan');
        oxlintSummary.configFiles.forEach((file) => {
          log(`    ✓ ${file}`, 'green');
        });
      }
      if (oxlintSummary.installedPackages.length > 0) {
        log('  安装依赖:', 'cyan');
        oxlintSummary.installedPackages.forEach((pkg) => {
          log(`    ✓ ${pkg}`, 'green');
        });
      }
      if (
        oxlintSummary.uninstalledPackages &&
        oxlintSummary.uninstalledPackages.length > 0
      ) {
        log('  卸载依赖:', 'cyan');
        oxlintSummary.uninstalledPackages.forEach((pkg) => {
          log(`    ✓ ${pkg}`, 'green');
        });
      }
      if (oxlintSummary.scripts && oxlintSummary.scripts.length > 0) {
        log('  添加脚本:', 'cyan');
        oxlintSummary.scripts.forEach((script) => {
          log(`    ✓ ${script}`, 'green');
        });
      }
    }
  }

  if (migratedToOxfmt) {
    log('\n📋 Oxfmt 使用说明:', 'bright');
    log('  格式化代码: npm run format', 'blue');
    log('  检查格式: npm run format:check', 'blue');
  }

  if (useStylelint) {
    log('\n📋 Stylelint 使用说明:', 'bright');
    log('  运行检查: npm run lint:css', 'blue');
    log('  自动修复: npm run lint:fix:css', 'blue');
  }

  if (addVSCode) {
    log('\n📋 VSCode 配置:', 'bright');
    log('  已生成 .vscode/settings.json', 'blue');
    log('  请安装相应的 VSCode 扩展:', 'blue');
    if (useESLint) log('    - ESLint (dbaeumer.vscode-eslint)', 'blue');
    if (useOxlint) log('    - Oxc (oxc.oxc-vscode)', 'blue');
    if (useStylelint)
      log('    - Stylelint (stylelint.vscode-stylelint)', 'blue');
    if (usePrettier && !useOxlint)
      log('    - Prettier (esbenp.prettier-vscode)', 'blue');
  }

  log('\n💡 提示: 可以查看文档了解更多配置选项', 'yellow');
  log('  文档: https://github.com/oceanbase/fe-lint-config', 'blue');
}
