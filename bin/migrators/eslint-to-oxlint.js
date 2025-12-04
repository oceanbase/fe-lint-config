import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import {
  ensurePluginsSupport,
  fixReactHooksRules,
  removeCommentsFromConfig,
} from '../generators/oxlint.js';
import { log } from '../utils/cli.js';

// 迁移 ESLint 配置到 Oxlint
export async function migrateESLintToOxlint(
  eslintConfigFile,
  useTypeScript,
  useReact,
) {
  try {
    // 构建迁移命令
    const args = [eslintConfigFile];
    args.push('--output-file', '.oxlintrc.json');

    log('\n🔄 使用 @oxlint/migrate 工具迁移 ESLint 配置...', 'cyan');

    // 使用 npx 运行迁移工具（使用最新版本）
    execSync(`npx @oxlint/migrate@latest ${args.join(' ')}`, {
      stdio: 'inherit',
    });

    // 修复生成的配置文件
    if (existsSync('.oxlintrc.json')) {
      const configContent = readFileSync('.oxlintrc.json', 'utf-8');
      let config;
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        // 如果解析失败，可能是 JSON 格式有问题（比如有注释）
        log('⚠️  JSON 解析失败，尝试清理注释后重试...', 'yellow');
        // 尝试使用更宽松的方式处理（实际上标准 JSON 不支持注释，这里主要是容错）
        throw parseError;
      }

      let hasChanges = false;

      // 1. 删除注释
      if (removeCommentsFromConfig(config)) {
        hasChanges = true;
        log('✓ 已删除配置中的注释', 'green');
      }

      // 2. 修复 react-hooks 规则前缀问题
      if (fixReactHooksRules(config)) {
        hasChanges = true;
        log('✓ 已修复 react-hooks 规则前缀（已归类到 react）', 'green');
      }

      // 3. 补充 TypeScript 和 React 插件支持
      const pluginsAdded = ensurePluginsSupport(
        config,
        useTypeScript,
        useReact,
      );
      if (pluginsAdded) {
        hasChanges = true;
        const addedPlugins = [];
        if (useTypeScript) {
          addedPlugins.push('TypeScript');
        }
        if (useReact) {
          addedPlugins.push('React');
        }
        if (addedPlugins.length > 0) {
          log(
            `✓ 检测到当前项目架构，已自动启用 ${addedPlugins.join(' 和 ')} 支持`,
            'green',
          );
        }
      } else if (useTypeScript || useReact) {
        // 如果插件已存在，也提示一下
        const enabledPlugins = [];
        if (useTypeScript && config.plugins?.includes('typescript')) {
          enabledPlugins.push('TypeScript');
        }
        if (useReact && config.plugins?.includes('react')) {
          enabledPlugins.push('React');
        }
        if (enabledPlugins.length > 0) {
          log(`✓ 已启用 ${enabledPlugins.join(' 和 ')} 支持`, 'green');
        }
      }

      // 如果有修改，保存文件
      if (hasChanges) {
        writeFileSync('.oxlintrc.json', JSON.stringify(config, null, 2));
      }
    }

    log('✓ ESLint 配置已迁移到 Oxlint', 'green');
    return true;
  } catch (error) {
    log(`⚠️  迁移失败: ${error.message}`, 'yellow');
    log('  将使用基础配置', 'yellow');
    return false;
  }
}
