#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// 导入统一的工具函数
import { detectOldESLintConfig } from '../detectors/eslint.js';
import { confirm, log } from '../utils/cli.js';
import {
  detectPackageManager,
  installDependencies,
} from '../utils/dependencies.js';
import { checkProjectRoot } from '../utils/file-utils.js';

// 从迁移工具输出中提取需要安装的包
function extractRequiredPackages(output) {
  const packages = [];
  const lines = output.split('\n');

  // 查找 "You will need to install the following packages" 行
  let foundStart = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('You will need to install')) {
      foundStart = true;
      continue;
    }

    if (foundStart) {
      // 匹配包名行，格式通常是 "- @eslint/js" 或 "- package-name"
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match) {
        const pkgName = match[1].trim();
        // 确保不是空字符串
        if (pkgName) {
          packages.push(pkgName);
        }
      }

      // 如果遇到安装命令提示或空行后跟着命令，停止解析
      if (
        line.includes('You can install') ||
        line.includes('npm install') ||
        line.includes('yarn add') ||
        line.includes('pnpm add')
      ) {
        break;
      }

      // 如果遇到空行且已经收集到包，可能是列表结束
      if (!line && packages.length > 0) {
        // 检查下一行是否是命令提示
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (
            nextLine.includes('You can install') ||
            nextLine.includes('npm install') ||
            nextLine.includes('yarn add') ||
            nextLine.includes('pnpm add')
          ) {
            break;
          }
        }
      }
    }
  }

  return packages;
}

// ============================================================================
// 迁移功能 (Migration)
// ============================================================================

// 使用 @eslint/migrate-config 迁移配置
async function migrateToFlatConfig(oldConfigFile) {
  try {
    log('\n🔄 使用 @eslint/migrate-config 工具迁移配置...', 'cyan');
    log('   正在将旧配置转换为 ESLint v9 flat config 格式...', 'cyan');

    // 检查是否已存在 eslint.config.mjs
    const outputFile = 'eslint.config.mjs';
    const hasOutputFile = existsSync(outputFile);

    if (hasOutputFile) {
      const overwrite = await confirm(`\n${outputFile} 已存在，是否覆盖?`);
      if (!overwrite) {
        log('已取消迁移', 'yellow');
        return { success: false, requiredPackages: [] };
      }
    }

    // 使用 npx 运行迁移工具（使用最新版本）
    // 捕获输出以解析需要安装的包
    let migrationOutput = '';
    let requiredPackages = [];

    try {
      // 使用 pipe 捕获输出，同时手动输出到控制台
      migrationOutput = execSync(
        `npx @eslint/migrate-config@latest ${oldConfigFile}`,
        {
          encoding: 'utf-8',
          stdio: ['inherit', 'pipe', 'pipe'], // 捕获 stdout 和 stderr
        },
      );
      // 输出到控制台
      process.stdout.write(migrationOutput);
    } catch (execError) {
      // 即使出错，也尝试从输出中提取信息
      if (execError.stdout) {
        migrationOutput = execError.stdout.toString();
        process.stdout.write(migrationOutput);
      }
      if (execError.stderr) {
        const stderrOutput = execError.stderr.toString();
        process.stderr.write(stderrOutput);
        // 将 stderr 也加入输出用于解析（可能包含需要安装的包信息）
        if (!migrationOutput) {
          migrationOutput = '';
        }
        migrationOutput += stderrOutput;
      }
      // 检查是否是 CallExpression 错误
      const errorMessage = execError.message || execError.toString();
      if (
        errorMessage.includes('Cannot convert') ||
        errorMessage.includes('CallExpression') ||
        errorMessage.includes('TypeError')
      ) {
        log('\n✗ 迁移失败: 配置文件包含工具无法处理的动态表达式', 'red');
        log('─'.repeat(50), 'yellow');
        log('   原因分析:', 'yellow');
        log('   - 配置文件中使用了 require.resolve() 等函数调用', 'yellow');
        log('   - 或使用了扩展运算符 (...) 等动态表达式', 'yellow');
        log('   - @eslint/migrate-config 只能处理静态字符串配置', 'yellow');
        log('   - 无法解析动态表达式和函数调用', 'yellow');
        log('─'.repeat(50), 'yellow');
        log('\n💡 解决方案:', 'cyan');
        log('   1. 手动替换 require.resolve() 为字符串路径', 'blue');
        log('      修改前:', 'blue');
        log(
          '        extends: require.resolve("@alipay/bigfish/eslint")',
          'blue',
        );
        log('      修改后:', 'blue');
        log('        extends: "@alipay/bigfish/eslint"', 'blue');
        log('', 'blue');
        log('   2. 如果使用了扩展运算符 (...)，需要去除并展开', 'blue');
        log('      修改前:', 'blue');
        log('        ...{ parser: "@typescript-eslint/parser" }', 'blue');
        log(
          '        extends: [...baseConfig, "plugin:react/recommended"]',
          'blue',
        );
        log('      修改后:', 'blue');
        log('        parser: "@typescript-eslint/parser"', 'blue');
        log(
          '        extends: ["eslint:recommended", "plugin:react/recommended"]',
          'blue',
        );
        log('', 'blue');
        log('   3. 简化配置文件，移除所有函数调用和动态表达式', 'blue');
        log('   4. 参考官方迁移指南:', 'blue');
        log(
          '      https://eslint.org/docs/latest/use/configure/migration-guide',
          'blue',
        );
        log('─'.repeat(50), 'yellow');
        return { success: false, requiredPackages: [] };
      }
      // 其他错误直接抛出
      throw execError;
    }

    // 从输出中提取需要安装的包
    if (migrationOutput) {
      requiredPackages = extractRequiredPackages(migrationOutput);
    }

    // 检查是否成功生成新配置文件
    if (existsSync(outputFile)) {
      log(`\n✓ 配置文件已成功迁移到 ${outputFile}`, 'green');
      log('   请检查生成的配置文件，确保所有规则和插件都正确迁移', 'yellow');

      // 从输出中提取需要安装的包
      if (migrationOutput) {
        requiredPackages = extractRequiredPackages(migrationOutput);
        if (requiredPackages.length > 0) {
          log('\n📦 检测到需要安装的依赖包:', 'cyan');
          log('─'.repeat(50), 'cyan');
          requiredPackages.forEach((pkg) => {
            log(`   - ${pkg}`, 'blue');
          });
          log('─'.repeat(50), 'cyan');

          const shouldInstall = await confirm(
            '\n是否现在安装这些依赖包? (推荐)',
          );
          if (shouldInstall) {
            await installDependencies(requiredPackages, true);
          } else {
            const pm = detectPackageManager();
            log('\n💡 您可以稍后手动安装:', 'yellow');
            if (pm === 'yarn') {
              log(`   yarn add --dev ${requiredPackages.join(' ')}`, 'blue');
            } else if (pm === 'pnpm') {
              log(
                `   pnpm add --save-dev ${requiredPackages.join(' ')}`,
                'blue',
              );
            } else {
              log(
                `   npm install --save-dev ${requiredPackages.join(' ')}`,
                'blue',
              );
            }
          }
        }
      }

      return { success: true, requiredPackages };
    } else {
      log('\n⚠️  迁移工具未生成新配置文件', 'yellow');
      return { success: false, requiredPackages: [] };
    }
  } catch (error) {
    log(`\n✗ 迁移失败: ${error.message}`, 'red');
    log('   请手动迁移配置或查看错误信息', 'yellow');
    return { success: false, requiredPackages: [] };
  }
}

// 备份旧配置文件
function backupOldConfig(configFile) {
  const backupFile = `${configFile}.backup`;
  try {
    const content = readFileSync(configFile, 'utf-8');
    writeFileSync(backupFile, content);
    log(`✓ 已备份旧配置文件到 ${backupFile}`, 'green');
    return backupFile;
  } catch (error) {
    log(`⚠️  备份失败: ${error.message}`, 'yellow');
    return null;
  }
}

// 删除旧配置文件
async function removeOldConfig(configFile) {
  const shouldRemove = await confirm(`\n是否删除旧的配置文件 ${configFile}?`);
  if (shouldRemove) {
    try {
      unlinkSync(configFile);
      log(`✓ 已删除旧配置文件 ${configFile}`, 'green');
      return true;
    } catch (error) {
      log(`⚠️  删除失败: ${error.message}`, 'yellow');
      return false;
    }
  }
  return false;
}

// ============================================================================
// 主流程 (Main Flow)
// ============================================================================

// 主流程
async function main() {
  checkProjectRoot();

  log('\n🚀 ESLint 配置迁移向导', 'bright');
  log('='.repeat(50), 'cyan');
  log('此工具将帮助您将旧版 ESLint 配置迁移到 v9 flat config 格式', 'cyan');

  // 步骤 1: 检测旧配置
  log('\n📋 正在检测 ESLint 配置文件...', 'cyan');
  const oldConfigFile = detectOldESLintConfig();

  if (!oldConfigFile) {
    log('\n✗ 未找到旧的 ESLint 配置文件', 'yellow');
    log(
      '   支持的格式: .eslintrc, .eslintrc.js, .eslintrc.json, .eslintrc.yml 等',
      'yellow',
    );
    process.exit(0);
  }

  log(`\n✓ 检测到配置文件: ${oldConfigFile}`, 'green');

  // 检查是否是 JavaScript 配置文件，提示限制
  if (
    oldConfigFile.endsWith('.js') ||
    oldConfigFile.endsWith('.cjs') ||
    oldConfigFile.endsWith('.mjs')
  ) {
    log('\n⚠️  重要提示：JavaScript 配置文件迁移限制', 'yellow');
    log('─'.repeat(50), 'yellow');
    log('   对于 .eslintrc.js/.eslintrc.cjs/.eslintrc.mjs 文件：', 'yellow');
    log('   - 工具只能迁移评估后的配置（执行后的结果）', 'yellow');
    log('   - 文件中的逻辑（函数、计算路径等）会丢失', 'yellow');
    log('   - 如果配置主要是静态的，结果会很好', 'yellow');
    log('   - 如果配置较复杂，建议手动迁移或检查生成的配置', 'yellow');
    log('─'.repeat(50), 'yellow');
    const continueAnyway = await confirm('\n是否继续迁移?');
    if (!continueAnyway) {
      log('已取消', 'yellow');
      process.exit(0);
    }
  }

  // 步骤 2: 显示配置信息
  try {
    const configContent = readFileSync(oldConfigFile, 'utf-8');
    log(`\n📄 配置文件内容预览:`, 'cyan');
    log('─'.repeat(50), 'cyan');
    // 只显示前 20 行
    const lines = configContent.split('\n').slice(0, 20);
    lines.forEach((line) => log(`   ${line}`, 'blue'));
    if (configContent.split('\n').length > 20) {
      log('   ...', 'blue');
    }
    log('─'.repeat(50), 'cyan');
  } catch (error) {
    log(`\n⚠️  无法读取配置文件: ${error.message}`, 'yellow');
  }

  // 步骤 3: 确认迁移
  log('\n📝 迁移说明:', 'cyan');
  log('   - 将使用 @eslint/migrate-config 官方工具进行迁移', 'blue');
  log('   - 会生成新的 eslint.config.mjs 文件', 'blue');
  log('   - 建议先备份旧配置文件', 'blue');
  log('   - 迁移后请检查生成的配置是否正确', 'blue');

  const shouldMigrate = await confirm('\n是否开始迁移?');
  if (!shouldMigrate) {
    log('已取消', 'yellow');
    process.exit(0);
  }

  // 步骤 4: 备份旧配置
  const shouldBackup = await confirm('\n是否备份旧配置文件? (推荐)');
  let backupFile = null;
  if (shouldBackup) {
    backupFile = backupOldConfig(oldConfigFile);
  }

  // 步骤 5: 执行迁移
  const migrationResult = await migrateToFlatConfig(oldConfigFile);

  if (migrationResult && migrationResult.success) {
    // 步骤 6: 清理旧配置
    log('\n🧹 清理旧配置文件', 'cyan');
    await removeOldConfig(oldConfigFile);

    // 步骤 7: 完成提示
    log('\n✨ 迁移完成!', 'green');
    log('='.repeat(50), 'cyan');
    log('\n📋 后续步骤:', 'cyan');
    log('   1. 检查生成的 eslint.config.mjs 文件', 'blue');
    log('   2. 确保所有规则和插件都正确迁移', 'blue');
    log('   3. 运行 eslint 测试配置是否正确', 'blue');
    if (backupFile) {
      log(`   4. 如有问题，可从 ${backupFile} 恢复`, 'blue');
    }
    log('\n💡 提示:', 'cyan');
    log('   - ESLint v9 使用 flat config 格式，不再支持 .eslintrc.*', 'blue');
    log('   - 如果遇到问题，请参考官方迁移指南', 'blue');
    log(
      '   - https://eslint.org/docs/latest/use/configure/migration-guide',
      'blue',
    );
  } else {
    log('\n⚠️  迁移未完成，请检查错误信息', 'yellow');
    if (backupFile) {
      log(`   备份文件: ${backupFile}`, 'blue');
    }
    process.exit(1);
  }
}

// 导出 main 函数，以便其他脚本可以调用
export { main };

// 如果直接运行此脚本，执行主流程
// 检查是否直接运行（通过比较 import.meta.url 和 process.argv[1]）
const __filename = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);

if (
  __filename === scriptPath ||
  __filename.replace(/\.js$/, '') === scriptPath.replace(/\.js$/, '')
) {
  main().catch((error) => {
    log(`\n✗ 发生错误: ${error.message}`, 'red');
    process.exit(1);
  });
}
