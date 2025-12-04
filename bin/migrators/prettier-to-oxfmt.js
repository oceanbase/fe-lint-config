import { execSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { resolve } from 'path';

import {
  checkEditorConfig,
  checkPackageJsonPrettierField,
  checkUnsupportedPrettierOptions,
} from '../detectors/prettier.js';
import { generateVSCodeConfigForOxfmt } from '../generators/vscode.js';
import { confirm, log } from '../utils/cli.js';
import {
  installDependencies,
  uninstallDependencies,
} from '../utils/dependencies.js';

// 迁移 Prettier 到 oxfmt
export async function migratePrettierToOxfmt(prettierInfo) {
  const summary = {
    configFiles: [],
    installedPackages: [],
    uninstalledPackages: [],
    scripts: [],
    vscodeConfig: false,
    warnings: [],
    removedFields: [],
  };
  // 检查限制和警告
  log('\n📋 检查配置兼容性...', 'cyan');

  const warnings = [];

  // 1. 检查文件格式
  const isJsonFormat =
    prettierInfo.prettierConfigFile &&
    (prettierInfo.prettierConfigFile.endsWith('.json') ||
      prettierInfo.prettierConfigFile === '.prettierrc');
  const isJsFormat =
    prettierInfo.prettierConfigFile &&
    (prettierInfo.prettierConfigFile.endsWith('.js') ||
      prettierInfo.prettierConfigFile.endsWith('.cjs') ||
      prettierInfo.prettierConfigFile.endsWith('.mjs'));

  // 2. 检查 package.json 中的 prettier 字段
  if (checkPackageJsonPrettierField()) {
    warnings.push(
      '- package.json 中的 prettier 字段: oxfmt 不支持，需要手动迁移',
    );
  }

  // 3. 检查 .editorconfig
  if (checkEditorConfig()) {
    warnings.push(
      '- .editorconfig: oxfmt 不支持，配置不会自动应用 .editorconfig 设置',
    );
  }

  // 先创建默认配置
  const defaultConfig = {
    $schema: './node_modules/oxfmt/configuration_schema.json',
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'all',
    proseWrap: 'never',
    endOfLine: 'lf',
    embeddedLanguageFormatting: 'auto',
  };

  // 先写入默认配置
  writeFileSync('.oxfmtrc.json', JSON.stringify(defaultConfig, null, 2));
  log('✓ 已创建默认的 .oxfmtrc.json 配置文件', 'green');
  summary.configFiles.push('.oxfmtrc.json');

  // 迁移配置文件：读取 Prettier 配置并合并
  if (prettierInfo.hasPrettierConfig && prettierInfo.prettierConfigFile) {
    try {
      let prettierConfig = {};

      // 读取 Prettier 配置
      if (isJsonFormat) {
        // 对于 JSON 格式，直接读取并解析
        const prettierConfigContent = readFileSync(
          prettierInfo.prettierConfigFile,
          'utf-8',
        );
        prettierConfig = JSON.parse(prettierConfigContent);
      } else if (isJsFormat) {
        // 对于 JS 格式，创建一个临时的 CommonJS 包装脚本来执行
        try {
          const configPath = resolve(
            process.cwd(),
            prettierInfo.prettierConfigFile,
          );
          const configContent = readFileSync(configPath, 'utf-8');

          // 创建一个临时的 .cjs 包装脚本来执行配置
          const tempWrapperPath = resolve(
            process.cwd(),
            '.prettierrc.temp.cjs',
          );

          // 创建一个自定义的 require.resolve，如果模块不存在就返回模块名本身
          // 因为 oxfmt 不支持 plugins，我们最终会删除这个字段，所以不需要实际解析
          const wrapperContent = `
// 临时包装脚本，用于执行 Prettier 配置
const originalResolve = require.resolve;
require.resolve = function(id) {
  try {
    return originalResolve.call(this, id);
  } catch (e) {
    // 如果模块不存在，返回模块名本身（作为字符串）
    // 反正 oxfmt 不支持 plugins，这个字段会被删除
    if (e.code === 'MODULE_NOT_FOUND') {
      return id;
    }
    throw e;
  }
};

${configContent
  .replace(/module\.exports\s*=\s*/, 'const config = ')
  .replace(/export\s+default\s+/, 'const config = ')
  .replace(/export\s+/, '// export ')}

console.log(JSON.stringify(config || {}, null, 2));
`;
          writeFileSync(tempWrapperPath, wrapperContent);

          try {
            // 执行临时脚本获取配置
            const configOutput = execSync(`node ${tempWrapperPath}`, {
              encoding: 'utf-8',
              cwd: process.cwd(),
            });
            prettierConfig = JSON.parse(configOutput.trim());

            // 清理临时文件
            unlinkSync(tempWrapperPath);
          } catch (execError) {
            // 清理临时文件
            if (existsSync(tempWrapperPath)) {
              unlinkSync(tempWrapperPath);
            }
            throw execError;
          }
        } catch (requireError) {
          log(
            `   ⚠️  无法执行 JavaScript 配置文件: ${requireError.message}`,
            'yellow',
          );
          log('   将使用默认配置，请手动迁移', 'yellow');
          prettierConfig = {};
        }
      } else {
        // 其他格式，使用默认配置
        log('   ⚠️  不支持的配置文件格式，将使用默认配置', 'yellow');
        prettierConfig = {};
      }

      // 检查配置中的不支持的选项
      const configWarnings = checkUnsupportedPrettierOptions(prettierConfig);
      warnings.push(...configWarnings);

      // 合并配置：从默认配置开始，然后用 Prettier 配置覆盖
      const oxfmtConfig = {
        ...defaultConfig,
        ...prettierConfig,
      };

      // 移除不支持的字段并记录（在外部作用域声明，以便后续使用）
      let removedFields = [];
      if (oxfmtConfig.overrides !== undefined) {
        delete oxfmtConfig.overrides;
        removedFields.push('overrides');
      }
      if (oxfmtConfig.plugins !== undefined) {
        delete oxfmtConfig.plugins;
        removedFields.push('plugins');
      }
      if (oxfmtConfig.experimentalTernaries !== undefined) {
        delete oxfmtConfig.experimentalTernaries;
        removedFields.push('experimentalTernaries');
      }
      if (oxfmtConfig.experimentalOperatorPosition !== undefined) {
        delete oxfmtConfig.experimentalOperatorPosition;
        removedFields.push('experimentalOperatorPosition');
      }
      if (oxfmtConfig.pluginSearchDirs !== undefined) {
        delete oxfmtConfig.pluginSearchDirs;
        removedFields.push('pluginSearchDirs');
      }

      if (removedFields.length > 0) {
        warnings.push(`- 已删除不支持的字段: ${removedFields.join(', ')}`);
      }

      // 读取 .prettierignore 并添加到 ignorePatterns
      if (existsSync('.prettierignore')) {
        try {
          const prettierIgnoreContent = readFileSync(
            '.prettierignore',
            'utf-8',
          );
          const ignorePatterns = prettierIgnoreContent
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#')); // 过滤空行和注释

          if (ignorePatterns.length > 0) {
            // 合并到配置中
            if (!oxfmtConfig.ignorePatterns) {
              oxfmtConfig.ignorePatterns = [];
            }
            // 合并并去重
            const existingPatterns = new Set(oxfmtConfig.ignorePatterns);
            ignorePatterns.forEach((pattern) => {
              if (pattern && !existingPatterns.has(pattern)) {
                existingPatterns.add(pattern);
              }
            });
            oxfmtConfig.ignorePatterns = Array.from(existingPatterns);
            log('✓ 已从 .prettierignore 读取忽略模式', 'green');
          }
        } catch (error) {
          log(`⚠️  读取 .prettierignore 失败: ${error.message}`, 'yellow');
        }
      }

      // 更新配置文件
      writeFileSync('.oxfmtrc.json', JSON.stringify(oxfmtConfig, null, 2));
      log('✓ 已更新 .oxfmtrc.json 配置文件（已合并 Prettier 配置）', 'green');
      summary.configFiles.push('.oxfmtrc.json');
      // 保存警告信息到 summary，稍后显示
      summary.warnings = warnings;
      summary.removedFields = removedFields;

      // 询问是否删除旧的 prettier 配置
      log('\n🗑️  清理旧配置', 'cyan');

      const removeOldConfig = await confirm(
        `\n是否删除旧的 Prettier 配置文件 ${prettierInfo.prettierConfigFile}?`,
      );
      if (removeOldConfig) {
        try {
          unlinkSync(prettierInfo.prettierConfigFile);
          log(`✓ 已删除 ${prettierInfo.prettierConfigFile}`, 'green');
          summary.configFiles.push(
            `已删除: ${prettierInfo.prettierConfigFile}`,
          );
        } catch (error) {
          log(`⚠️  删除失败: ${error.message}`, 'yellow');
        }
      }
    } catch (error) {
      log(`⚠️  迁移配置文件时出错: ${error.message}`, 'yellow');
      log('   将使用默认配置', 'yellow');
      // 配置文件已创建，使用默认配置即可
    }
  }

  // 询问是否卸载 Prettier
  if (prettierInfo.prettierPackages.length > 0) {
    const removePrettier = await confirm(
      `\n是否卸载 Prettier 相关包? (${prettierInfo.prettierPackages.join(', ')})`,
    );
    if (removePrettier) {
      uninstallDependencies(prettierInfo.prettierPackages);
      summary.uninstalledPackages.push(...prettierInfo.prettierPackages);
    }
  }

  // 安装 oxfmt
  log('\n📦 正在安装 oxfmt...', 'cyan');
  installDependencies(['oxfmt'], true);
  summary.installedPackages.push('oxfmt');

  // 更新 package.json 脚本
  if (existsSync('package.json')) {
    try {
      let pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      if (!pkg.scripts) {
        pkg.scripts = {};
      }

      // 引导添加 format 脚本
      log('\n📝 配置 package.json 脚本', 'cyan');
      const addFormatScript = await confirm('是否添加 format 相关脚本? (推荐)');

      if (addFormatScript) {
        pkg.scripts.format = 'oxfmt';
        pkg.scripts['format:check'] = 'oxfmt --check';
        log('✓ 已添加 format 脚本', 'green');
        log('   - format: 格式化代码', 'blue');
        log('   - format:check: 检查代码格式', 'blue');
      }

      // 询问是否添加 lint-staged 配置
      const addLintStaged = await confirm(
        '\n是否配置 lint-staged? (推荐，用于 Git 提交前自动格式化)',
      );

      if (addLintStaged) {
        if (!pkg.devDependencies) {
          pkg.devDependencies = {};
        }

        // 检查是否已安装 lint-staged
        if (
          !pkg.devDependencies['lint-staged'] &&
          !pkg.dependencies?.['lint-staged']
        ) {
          log('\n📦 需要安装 lint-staged', 'cyan');
          const installLintStaged = await confirm('是否现在安装 lint-staged?');
          if (installLintStaged) {
            installDependencies(['lint-staged'], true);
            summary.installedPackages.push('lint-staged');
            // 安装后重新读取 package.json 以获取最新状态
            pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
          }
        }

        // 配置 lint-staged（合并而不是覆盖）
        if (!pkg['lint-staged']) {
          pkg['lint-staged'] = {};
        }

        // 检测并替换 prettier 相关的命令
        const oxfmtPattern = '*.{js,jsx,ts,tsx}';
        const oxfmtCommand = 'oxfmt --write';

        const updatedLintStaged = { ...pkg['lint-staged'] };

        // 检查并替换所有 prettier 相关的命令
        for (const [pattern, commands] of Object.entries(updatedLintStaged)) {
          if (Array.isArray(commands)) {
            // 检查命令中是否包含 prettier
            const hasPrettier = commands.some(
              (cmd) => typeof cmd === 'string' && cmd.includes('prettier'),
            );
            if (hasPrettier) {
              // 替换 prettier 命令为 oxfmt
              updatedLintStaged[pattern] = commands.map((cmd) => {
                if (typeof cmd === 'string' && cmd.includes('prettier')) {
                  return cmd.replace(/prettier[^"]*/g, 'oxfmt --write');
                }
                return cmd;
              });
            }
          }
        }

        // 检查是否已有完全匹配的模式
        if (updatedLintStaged[oxfmtPattern]) {
          // 模式已存在，合并命令
          const existingCommands = Array.isArray(
            updatedLintStaged[oxfmtPattern],
          )
            ? updatedLintStaged[oxfmtPattern]
            : [updatedLintStaged[oxfmtPattern]];

          // 移除 prettier 命令（如果存在），添加 oxfmt（如果不存在）
          const filteredCommands = existingCommands.filter(
            (cmd) => typeof cmd !== 'string' || !cmd.includes('prettier'),
          );
          if (!filteredCommands.includes(oxfmtCommand)) {
            filteredCommands.push(oxfmtCommand);
          }
          updatedLintStaged[oxfmtPattern] = filteredCommands;
        } else {
          // 模式不存在，检查是否有部分匹配的模式需要合并
          const matchingPattern = Object.keys(updatedLintStaged).find(
            (p) =>
              p.includes('*.{js') ||
              p.includes('*.js') ||
              p.includes('*.ts') ||
              p.includes('*.json') ||
              p.includes('*.css') ||
              p.includes('*.less') ||
              p.includes('*.scss') ||
              p.includes('*.md'),
          );

          if (matchingPattern) {
            // 找到部分匹配的模式，合并命令
            const existingCommands = Array.isArray(
              updatedLintStaged[matchingPattern],
            )
              ? updatedLintStaged[matchingPattern]
              : [updatedLintStaged[matchingPattern]];

            // 移除 prettier 命令（如果存在），添加 oxfmt（如果不存在）
            const filteredCommands = existingCommands.filter(
              (cmd) => typeof cmd !== 'string' || !cmd.includes('prettier'),
            );
            if (!filteredCommands.includes(oxfmtCommand)) {
              filteredCommands.push(oxfmtCommand);
            }
            updatedLintStaged[matchingPattern] = filteredCommands;
          } else {
            // 没有匹配的模式，添加新模式
            updatedLintStaged[oxfmtPattern] = [oxfmtCommand];
          }
        }

        pkg['lint-staged'] = updatedLintStaged;

        // 检查是否已安装 husky
        const hasHusky =
          (pkg.devDependencies && pkg.devDependencies.husky) ||
          (pkg.dependencies && pkg.dependencies.husky);

        if (!hasHusky) {
          log(
            '\n💡 提示: 如需在 Git 提交时自动运行 lint-staged，需要安装 husky',
            'yellow',
          );
          const installHusky = await confirm('是否安装 husky? (可选)');
          if (installHusky) {
            installDependencies(['husky'], true);
            summary.installedPackages.push('husky');
            // 安装后重新读取 package.json 以获取最新状态
            pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
            // 在 package.json 中添加 prepare 脚本（husky 推荐方式）
            if (!pkg.scripts) {
              pkg.scripts = {};
            }
            if (!pkg.scripts.prepare) {
              pkg.scripts.prepare = 'husky';
              log('✓ 已添加 prepare 脚本到 package.json', 'green');
            }
            // 初始化 husky（创建 .husky 目录）
            try {
              execSync('npx husky init', { stdio: 'inherit' });
              // 初始化后会创建 pre-commit，需要立即更新为 lint-staged
              if (existsSync('.husky/pre-commit')) {
                writeFileSync(
                  '.husky/pre-commit',
                  '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx lint-staged\n',
                );
                execSync('chmod +x .husky/pre-commit', { stdio: 'inherit' });
                log('✓ 已初始化 husky 并配置 pre-commit hook', 'green');
              }
            } catch (error) {
              log('⚠️  husky 初始化失败，请手动运行: npx husky init', 'yellow');
            }
          }
        } else {
          // 如果已安装 husky，确保 package.json 中有 prepare 脚本
          if (!pkg.scripts) {
            pkg.scripts = {};
          }
          if (!pkg.scripts.prepare) {
            pkg.scripts.prepare = 'husky';
            log('✓ 已添加 prepare 脚本到 package.json', 'green');
          }

          // 检查是否有 pre-commit hook
          if (existsSync('.husky/pre-commit')) {
            const preCommitContent = readFileSync('.husky/pre-commit', 'utf-8');
            if (!preCommitContent.includes('lint-staged')) {
              // 替换或添加 lint-staged 到 pre-commit hook
              const lines = preCommitContent.split('\n');
              const huskyHeader = lines
                .filter((line) => line.includes('husky.sh'))
                .join('\n');
              const newContent = `${huskyHeader}\n\nnpx lint-staged\n`;
              writeFileSync('.husky/pre-commit', newContent);
              execSync('chmod +x .husky/pre-commit', { stdio: 'inherit' });
              log('✓ 已更新 .husky/pre-commit hook', 'green');
            }
          } else {
            // 创建 pre-commit hook
            if (!existsSync('.husky')) {
              mkdirSync('.husky', { recursive: true });
            }
            writeFileSync(
              '.husky/pre-commit',
              '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx lint-staged\n',
            );
            execSync('chmod +x .husky/pre-commit', { stdio: 'inherit' });
            log('✓ 已创建 .husky/pre-commit hook', 'green');
          }
        }

        log('✓ 已配置 lint-staged', 'green');
        log('   - 提交前自动格式化匹配的文件', 'blue');
      }

      writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    } catch (error) {
      log(`⚠️  更新 package.json 失败: ${error.message}`, 'yellow');
    }
  }

  // 询问是否生成 VSCode/Cursor 配置
  log('\n🔧 编辑器配置', 'cyan');
  const addVSCode = await confirm('是否生成 VSCode/Cursor 配置文件? (推荐)');

  let vscodeConfigGenerated = false;
  if (addVSCode) {
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

    // 生成新配置，使用 oxfmt 作为格式化工具
    const newConfig = JSON.parse(generateVSCodeConfigForOxfmt());

    // 合并配置
    const mergedConfig = { ...existingConfig };
    Object.assign(mergedConfig, newConfig);

    // 合并 codeActionsOnSave
    if (newConfig['editor.codeActionsOnSave']) {
      if (!mergedConfig['editor.codeActionsOnSave']) {
        mergedConfig['editor.codeActionsOnSave'] = {};
      }
      Object.assign(
        mergedConfig['editor.codeActionsOnSave'],
        newConfig['editor.codeActionsOnSave'],
      );
    }

    // 合并语言特定配置（如 [javascript], [typescript] 等）
    for (const key in newConfig) {
      if (key.startsWith('[') && key.endsWith(']')) {
        if (!mergedConfig[key]) {
          mergedConfig[key] = {};
        }
        Object.assign(mergedConfig[key], newConfig[key]);
      }
    }

    writeFileSync(
      '.vscode/settings.json',
      JSON.stringify(mergedConfig, null, 2),
    );
    log('✓ VSCode/Cursor 配置文件已生成 (.vscode/settings.json)', 'green');
    vscodeConfigGenerated = true;
    summary.vscodeConfig = true;
    summary.configFiles.push('.vscode/settings.json');
  }

  return { vscodeConfigGenerated, summary };
}
