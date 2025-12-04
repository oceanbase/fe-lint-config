import { existsSync, writeFileSync } from 'fs';

import { generateBaseOxlintConfig } from '../generators/oxlint.js';
import { migrateESLintToOxlint } from '../migrators/eslint-to-oxlint.js';
import { confirm, log } from '../utils/cli.js';

/**
 * 设置 Oxlint 配置
 * @param {Object} options - 配置选项
 * @param {string|null} oldConfigFile - 旧的 ESLint 配置文件路径
 * @param {boolean} useTypeScript - 是否使用 TypeScript
 * @param {boolean} useReact - 是否使用 React
 * @returns {Promise<boolean>} 是否成功生成配置
 */
export async function setupOxlintConfig(options) {
  const { oldConfigFile, useTypeScript, useReact } = options;
  const summary = {
    configFiles: [],
    installedPackages: [],
    uninstalledPackages: [],
    scripts: [],
  };

  // 如果检测到 ESLint 配置，直接使用官方工具迁移（不自己解析）
  if (oldConfigFile) {
    log(`\n📋 检测到旧的 ESLint 配置文件: ${oldConfigFile}`, 'cyan');
    log('   正在使用官方工具迁移到 Oxlint...', 'cyan');

    // 如果文件已存在，询问用户是否覆盖
    if (existsSync('.oxlintrc.json')) {
      const overwrite = await confirm('.oxlintrc.json 已存在，是否覆盖?');
      if (!overwrite) {
        log('已跳过迁移', 'yellow');
        return { success: true, summary }; // 用户选择不覆盖，视为成功（保留现有配置）
      }
    }

    // 尝试使用官方工具迁移
    const migrated = await migrateESLintToOxlint(
      oldConfigFile,
      useTypeScript,
      useReact,
    );

    if (!migrated) {
      // 迁移失败，给出建议
      log('\n⚠️  官方工具迁移失败', 'yellow');
      log('─'.repeat(50), 'yellow');
      log('   可能原因：', 'yellow');
      log('   - 配置文件中包含动态逻辑（如 require.resolve()）', 'yellow');
      log('─'.repeat(50), 'yellow');
      log('\n💡 解决方案：', 'cyan');
      log('   1. 手动替换 require.resolve() 为字符串路径', 'blue');
      log('      例如: require.resolve("@alipay/bigfish/eslint")', 'blue');
      log('      改为: "@alipay/bigfish/eslint"', 'blue');
      log('   2. 简化配置文件，移除所有函数调用', 'blue');
      log(
        '   3. 或先使用 migrate-eslint-config 工具将配置转换为 v9 格式',
        'blue',
      );
      log('      npx @oceanbase/lint-config migrate-eslint-config', 'blue');
      log('      然后再使用 @oxlint/migrate 工具迁移', 'blue');
      log('      npx @oxlint/migrate@latest eslint.config.mjs', 'blue');
      log('─'.repeat(50), 'yellow');

      // 生成默认配置
      const baseConfig = generateBaseOxlintConfig({
        typescript: useTypeScript,
        react: useReact,
      });
      writeFileSync('.oxlintrc.json', JSON.stringify(baseConfig, null, 2));
      log('\n✓ 已生成默认 Oxlint 配置文件', 'green');
      log('   您可以稍后手动迁移规则到 .oxlintrc.json', 'blue');
      summary.configFiles.push('.oxlintrc.json');
      return { success: true, summary };
    }

    summary.configFiles.push('.oxlintrc.json');
    return { success: true, summary }; // 迁移成功
  } else {
    // 没有 ESLint 配置，直接生成基础配置
    const baseConfig = generateBaseOxlintConfig({
      typescript: useTypeScript,
      react: useReact,
    });

    if (existsSync('.oxlintrc.json')) {
      const overwrite = await confirm('.oxlintrc.json 已存在，是否覆盖?');
      if (overwrite) {
        writeFileSync('.oxlintrc.json', JSON.stringify(baseConfig, null, 2));
        log('✓ Oxlint 配置文件已生成', 'green');
        summary.configFiles.push('.oxlintrc.json');
        return { success: true, summary };
      } else {
        return { success: true, summary }; // 用户选择不覆盖，保留现有配置
      }
    } else {
      writeFileSync('.oxlintrc.json', JSON.stringify(baseConfig, null, 2));
      log('✓ Oxlint 配置文件已生成', 'green');
      summary.configFiles.push('.oxlintrc.json');
      return { success: true, summary };
    }
  }
}
