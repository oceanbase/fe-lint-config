#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';

// 导入工具模块
import { checkNodeVersion, confirm, log, select } from './utils/cli.js';
import {
  collectDependencies,
  installDependencies,
} from './utils/dependencies.js';
import { checkProjectRoot } from './utils/file-utils.js';

// 导入检测器模块
import { detectOldESLintConfig } from './detectors/eslint.js';
import { detectPrettier } from './detectors/prettier.js';
import {
  detectOldStylelintConfig,
  migrateStylelintConfig,
} from './detectors/stylelint.js';

// 导入生成器模块
import { generateESLintConfig } from './generators/eslint.js';
import { generateStylelintConfig } from './generators/stylelint.js';

// 导入迁移器模块
import { migratePrettierToOxfmt } from './migrators/prettier-to-oxfmt.js';

// 导入设置模块
import { cleanupDependencies } from './setup/cleanup-dependencies.js';
import { showCompletionMessage } from './setup/completion-message.js';
import { setupLintStaged } from './setup/lint-staged-setup.js';
import { setupOxlintConfig } from './setup/oxlint-setup.js';
import { setupScripts } from './setup/scripts-setup.js';
import { setupVSCodeConfig } from './setup/vscode-setup.js';

// ============================================================================
// 主流程 (Main Flow)
// ============================================================================

// 主流程
async function main() {
  checkProjectRoot();

  log('\n🚀 欢迎使用 Lint 配置向导', 'bright');
  log('='.repeat(50), 'cyan');

  // 步骤 0: 检查 Node 版本
  const nodeVersionOk = checkNodeVersion();
  if (!nodeVersionOk) {
    const continueAnyway = await confirm('是否继续? (不推荐)');
    if (!continueAnyway) {
      log('已取消', 'yellow');
      process.exit(0);
    }
  }

  // 步骤 1: 选择 Linter 或迁移选项
  const linterChoice = await select('请选择要使用的代码检查工具:', [
    'Oxlint (极速性能)',
    'Oxfmt (格式化工具迁移，平替 Prettier)',
    '@oceanbase/lint-config(Eslint v9 & Stylelint v16)',
    'ESLint 版本升级 (将旧版 ESLint 配置迁移到 v9 flat config)',
    'eslint-plugin-oxlint (同时使用 ESLint v9 & Oxlint， 自动关闭 Eslint 中 Oxlint 配置规则)',
  ]);

  // 如果选择迁移 Prettier 到 oxfmt
  if (linterChoice === 1) {
    const prettierInfo = detectPrettier();
    if (!prettierInfo.hasPrettier && !prettierInfo.hasPrettierConfig) {
      log('\n⚠️  未检测到 Prettier 配置', 'yellow');
      log('   请先安装 Prettier 或创建 Prettier 配置文件', 'yellow');
      process.exit(0);
    }

    log('\n📦 检测到 Prettier 配置', 'cyan');
    log('─'.repeat(50), 'cyan');
    if (prettierInfo.hasPrettier) {
      log(`   已安装的包: ${prettierInfo.prettierPackages.join(', ')}`, 'blue');
    }
    if (prettierInfo.hasPrettierConfig) {
      log(`   配置文件: ${prettierInfo.prettierConfigFile}`, 'blue');
    }
    log('─'.repeat(50), 'cyan');
    log('\n💡 将迁移到 oxfmt:', 'yellow');
    log('   - oxfmt 是 Oxc 项目提供的格式化工具，性能更快', 'blue');
    log('   - 与 Prettier 兼容，迁移简单', 'blue');
    log('   - 与 Oxlint 配合使用体验更好', 'blue');

    const confirmMigrate = await confirm('\n是否开始迁移?');
    if (!confirmMigrate) {
      log('已取消', 'yellow');
      process.exit(0);
    }

    // 执行迁移
    const { vscodeConfigGenerated, summary } =
      await migratePrettierToOxfmt(prettierInfo);

    log('\n✨ 迁移完成!', 'green');
    log('='.repeat(50), 'cyan');

    // 显示步骤汇总
    log('\n📋 迁移结果汇总:', 'bright');
    if (summary.configFiles.length > 0) {
      log('  生成配置文件:', 'cyan');
      summary.configFiles.forEach((file) => {
        log(`    ✓ ${file}`, 'green');
      });
    }
    if (summary.installedPackages.length > 0) {
      log('  安装依赖:', 'cyan');
      summary.installedPackages.forEach((pkg) => {
        log(`    ✓ ${pkg}`, 'green');
      });
    }
    if (summary.uninstalledPackages.length > 0) {
      log('  卸载依赖:', 'cyan');
      summary.uninstalledPackages.forEach((pkg) => {
        log(`    ✓ ${pkg}`, 'green');
      });
    }
    if (summary.scripts.length > 0) {
      log('  添加脚本:', 'cyan');
      summary.scripts.forEach((script) => {
        log(`    ✓ ${script}`, 'green');
      });
    }

    log('\n📋 Oxfmt 使用说明:', 'bright');
    log('  格式化代码: npm run format', 'blue');
    log('  检查格式: npm run format:check', 'blue');

    // 如果生成了 VSCode 配置文件，显示扩展说明
    if (vscodeConfigGenerated) {
      log('\n📋 请安装以下扩展:', 'cyan');
      log('   - Oxc (oxc.oxc-vscode)', 'blue');
      log('     用于代码检查和格式化', 'blue');
    }

    // 显示迁移过程中检测到的警告和提示
    if (summary.warnings && summary.warnings.length > 0) {
      log('\n⚠️  检测到以下限制或需要注意的事项:', 'yellow');
      log('─'.repeat(50), 'yellow');
      summary.warnings.forEach((warning) => {
        log(`   ${warning}`, 'yellow');
      });
      log('─'.repeat(50), 'yellow');
    }

    if (summary.removedFields && summary.removedFields.length > 0) {
      log('\n⚠️  重要提示:', 'yellow');
      log('─'.repeat(50), 'yellow');
      log('   检测到您的配置中使用了 oxfmt 当前不支持的字段', 'yellow');
      log('   (如 plugins, overrides, experimentalTernaries 等)', 'yellow');
      log('   建议自行调整配置', 'yellow');
      log('─'.repeat(50), 'yellow');
    }

    if (
      (summary.warnings && summary.warnings.length > 0) ||
      (summary.removedFields && summary.removedFields.length > 0)
    ) {
      log('\n💡 提示:', 'cyan');
      log('   - printWidth 默认值: oxfmt 为 100，Prettier 为 80', 'blue');
      log(
        '   - 如需 import 排序功能，可使用 experimentalSortImports 选项',
        'blue',
      );
      log(
        '   - 更多信息请参考: https://oxc.rs/docs/guide/usage/formatting',
        'blue',
      );
    }

    log('\n💡 提示: 可以查看文档了解更多配置选项', 'yellow');
    log('  https://github.com/oceanbase/fe-lint-config\n', 'blue');
    process.exit(0);
  }

  // 如果选择 ESLint 配置迁移，单独处理
  if (linterChoice === 3) {
    const { main: migrateESLintConfig } =
      await import('./migrators/eslint-to-flat-config.js');
    // eslint-to-flat-config.js 的 main 函数会处理整个流程
    await migrateESLintConfig();
    process.exit(0);
  }

  // 如果选择 eslint-plugin-oxlint，单独处理
  if (linterChoice === 4) {
    const { setupESLintPluginOxlint } =
      await import('./setup/eslint-plugin-oxlint-setup.js');
    const result = await setupESLintPluginOxlint();

    if (result.success) {
      log('\n✨ 配置完成!', 'green');
      log('='.repeat(50), 'cyan');

      // 显示步骤汇总
      log('\n📋 配置结果汇总:', 'bright');
      if (result.summary.installedPackages.length > 0) {
        log('  安装依赖:', 'cyan');
        result.summary.installedPackages.forEach((pkg) => {
          log(`    ✓ ${pkg}`, 'green');
        });
      }
      if (result.summary.configFiles.length > 0) {
        log('  更新配置文件:', 'cyan');
        result.summary.configFiles.forEach((file) => {
          log(`    ✓ ${file}`, 'green');
        });
      }
      if (result.summary.scripts.length > 0) {
        log('  更新脚本:', 'cyan');
        result.summary.scripts.forEach((script) => {
          log(`    ✓ ${script}`, 'green');
        });
      }

      log('\n📋 使用说明:', 'bright');
      log('  运行检查: npm run lint', 'blue');
      log('  (会先运行 oxlint，然后运行 eslint)', 'blue');
      log('\n💡 提示: 可以查看文档了解更多配置选项', 'yellow');
      log('  https://github.com/oceanbase/fe-lint-config\n', 'blue');
    } else {
      log('\n⚠️  配置未完成，请手动完成剩余步骤', 'yellow');
    }
    process.exit(0);
  }

  const useESLint = linterChoice === 2;
  const useOxlint = linterChoice === 0;

  // 步骤 2: 检测项目类型
  const hasTypeScript = existsSync('tsconfig.json');
  const hasReact =
    existsSync('package.json') &&
    readFileSync('package.json', 'utf-8').includes('react');

  let useTypeScript = false;
  let useReact = false;

  if (hasTypeScript) {
    useTypeScript = true;
  } else {
    useTypeScript = await confirm('是否使用 TypeScript?');
  }

  if (hasReact) {
    useReact = true;
  } else {
    useReact = await confirm('是否使用 React?');
  }

  // 步骤 3: 初始化配置选项
  let usePrettier = true; // 默认启用
  let useImport = true; // 默认启用
  let migratedToOxfmt = false; // 跟踪是否迁移到 oxfmt

  // 检测旧的 ESLint 配置（仅用于 oxlint 迁移）
  const oldConfigFile = detectOldESLintConfig();

  // 如果选择 ESLint，初始化配置选项（默认启用）
  if (useESLint) {
    log('\n📋 配置选项（已默认开启，如需关闭可在配置文件中修改）:', 'cyan');
    if (useTypeScript) {
      log('   - TypeScript 支持: 已开启', 'blue');
    }
    if (useReact) {
      log('   - React 支持: 已开启', 'blue');
    }
    log('   - Prettier 格式化: 已开启', 'blue');
    log('   - import 规则检查: 已开启', 'blue');
  }

  // 步骤 4: 生成配置文件
  log('\n📝 正在生成配置文件...', 'cyan');

  if (useESLint) {
    const eslintConfig = generateESLintConfig({
      typescript: useTypeScript,
      react: useReact,
      prettier: usePrettier,
      import: useImport,
      rules: {},
    });

    if (existsSync('eslint.config.mjs')) {
      const overwrite = await confirm('eslint.config.mjs 已存在，是否覆盖?');
      if (overwrite) {
        writeFileSync('eslint.config.mjs', eslintConfig);
        log('✓ ESLint 配置文件已生成', 'green');
      }
    } else {
      writeFileSync('eslint.config.mjs', eslintConfig);
      log('✓ ESLint 配置文件已生成', 'green');
    }
  }

  let oxlintSummary = null;
  if (useOxlint) {
    const result = await setupOxlintConfig({
      oldConfigFile,
      useTypeScript,
      useReact,
    });
    oxlintSummary = result.summary;
    // 初始化汇总信息（如果还没有）
    if (!oxlintSummary) {
      oxlintSummary = {
        configFiles: [],
        installedPackages: [],
        uninstalledPackages: [],
        scripts: [],
      };
    }
  }

  // 步骤 5: Stylelint 配置（仅在 ESLint 或两者共存时询问）
  let useStylelint = false;
  let stylelintRules = {};

  if (useESLint) {
    useStylelint = await confirm('\n是否配置 Stylelint (CSS/Less 代码检查)?');

    if (useStylelint) {
      // 检测旧的 stylelint 配置
      const oldStylelintConfigFile = detectOldStylelintConfig();
      if (oldStylelintConfigFile) {
        log(
          `\n📋 检测到旧的 Stylelint 配置文件: ${oldStylelintConfigFile}`,
          'cyan',
        );
        const migrate = await confirm('是否迁移现有配置规则?');

        if (migrate) {
          stylelintRules = await migrateStylelintConfig(oldStylelintConfigFile);
        }
      }

      const stylelintConfig = generateStylelintConfig({
        rules: stylelintRules,
      });

      if (existsSync('.stylelintrc.mjs')) {
        const overwrite = await confirm('.stylelintrc.mjs 已存在，是否覆盖?');
        if (overwrite) {
          writeFileSync('.stylelintrc.mjs', stylelintConfig);
          log('✓ Stylelint 配置文件已生成', 'green');
        }
      } else {
        writeFileSync('.stylelintrc.mjs', stylelintConfig);
        log('✓ Stylelint 配置文件已生成', 'green');
      }
    }
  }

  // 步骤 6: 安装依赖
  const packages = collectDependencies(
    {
      useESLint,
      useOxlint,
      useStylelint,
      usePrettier,
    },
    false, // hasESLintConfig - 不再用于依赖收集
    false, // hasMigratedRules - 不再用于依赖收集
  );

  if (packages.length > 0) {
    log('\n📦 需要安装以下依赖:', 'cyan');
    packages.forEach((pkg) => {
      log(`   - ${pkg}`, 'blue');
    });
    const install = await confirm('\n是否现在安装依赖?');

    if (install) {
      installDependencies(packages, true);
      // 收集 oxlint 相关的依赖到 summary
      if (useOxlint && oxlintSummary) {
        const oxlintPackages = packages.filter(
          (pkg) => pkg.includes('oxlint') || pkg === 'oxlint',
        );
        oxlintSummary.installedPackages.push(...oxlintPackages);
      }
    }
  }

  // 步骤 7: 添加 scripts
  const scriptsAdded = await setupScripts({
    useESLint,
    useOxlint,
    useStylelint,
  });
  // 收集 oxlint 相关的脚本到 summary
  if (useOxlint && oxlintSummary && scriptsAdded) {
    oxlintSummary.scripts.push('lint:oxlint', 'lint:oxlint:fix');
  }

  // 步骤 7.5: 配置 lint-staged (仅 oxlint)
  await setupLintStaged({
    useOxlint,
  });

  // 步骤 8: VSCode 配置
  const addVSCode = await setupVSCodeConfig({
    useESLint,
    useOxlint,
    useStylelint,
    usePrettier: usePrettier && !migratedToOxfmt, // 如果已迁移到 oxfmt，不使用 prettier
  });

  // 步骤 10: 如果只选择了 oxlint，询问是否卸载 ESLint/Prettier 依赖
  const uninstalledPackages = await cleanupDependencies({
    useOxlint,
    useESLint,
  });
  // 收集卸载的依赖到 summary
  if (useOxlint && oxlintSummary && uninstalledPackages) {
    oxlintSummary.uninstalledPackages.push(...uninstalledPackages);
  }

  // 完成
  showCompletionMessage({
    useESLint,
    useOxlint,
    useStylelint,
    usePrettier,
    migratedToOxfmt,
    addVSCode,
    oxlintSummary,
  });
}

main().catch((error) => {
  log(`\n✗ 发生错误: ${error.message}`, 'yellow');
  console.error(error);
  process.exit(1);
});
