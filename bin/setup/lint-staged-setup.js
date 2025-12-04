import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import { confirm, log } from '../utils/cli.js';
import { installDependencies } from '../utils/dependencies.js';

/**
 * 配置 lint-staged（仅用于 oxlint）
 * @param {Object} options - 配置选项
 * @param {boolean} options.useOxlint - 是否使用 Oxlint
 * @returns {Promise<boolean>} 是否成功配置
 */
export async function setupLintStaged(options) {
  const { useOxlint } = options;

  if (!useOxlint || !existsSync('package.json')) {
    return false;
  }

  const addLintStaged = await confirm(
    '\n是否配置 lint-staged? (推荐，用于 Git 提交前自动检查代码)',
  );

  if (!addLintStaged) {
    return false;
  }

  let pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
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
      await installDependencies(['lint-staged'], true);
      // 安装后重新读取 package.json 以获取最新状态
      pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    }
  }

  // 配置 lint-staged（合并而不是覆盖）
  if (!pkg['lint-staged']) {
    pkg['lint-staged'] = {};
  }

  // oxlint 的文件模式和命令
  const oxlintPattern = '*.{js,jsx,ts,tsx,json,jsonc}';
  const oxlintCommand = 'oxlint --fix';

  const updatedLintStaged = { ...pkg['lint-staged'] };

  // 检查并替换所有 eslint 相关的命令
  for (const [pattern, commands] of Object.entries(updatedLintStaged)) {
    if (Array.isArray(commands)) {
      // 检查命令中是否包含 eslint
      const hasEslint = commands.some(
        (cmd) => typeof cmd === 'string' && cmd.includes('eslint'),
      );
      if (hasEslint) {
        // 替换 eslint 命令为 oxlint
        updatedLintStaged[pattern] = commands.map((cmd) => {
          if (typeof cmd === 'string' && cmd.includes('eslint')) {
            return cmd.replace(/eslint[^"]*/g, 'oxlint --fix');
          }
          return cmd;
        });
      }
    }
  }

  // 检查是否已有完全匹配的模式
  if (updatedLintStaged[oxlintPattern]) {
    // 模式已存在，合并命令
    const existingCommands = Array.isArray(updatedLintStaged[oxlintPattern])
      ? updatedLintStaged[oxlintPattern]
      : [updatedLintStaged[oxlintPattern]];

    // 移除 eslint 命令（如果存在），添加 oxlint（如果不存在）
    const filteredCommands = existingCommands.filter(
      (cmd) => typeof cmd !== 'string' || !cmd.includes('eslint'),
    );
    if (!filteredCommands.includes(oxlintCommand)) {
      filteredCommands.push(oxlintCommand);
    }
    updatedLintStaged[oxlintPattern] = filteredCommands;
  } else {
    // 模式不存在，检查是否有部分匹配的模式需要合并
    const matchingPattern = Object.keys(updatedLintStaged).find(
      (p) =>
        p.includes('*.{js') ||
        p.includes('*.js') ||
        p.includes('*.ts') ||
        p.includes('*.json'),
    );

    if (matchingPattern) {
      // 找到部分匹配的模式，合并命令
      const existingCommands = Array.isArray(updatedLintStaged[matchingPattern])
        ? updatedLintStaged[matchingPattern]
        : [updatedLintStaged[matchingPattern]];

      // 移除 eslint 命令（如果存在），添加 oxlint（如果不存在）
      const filteredCommands = existingCommands.filter(
        (cmd) => typeof cmd !== 'string' || !cmd.includes('eslint'),
      );
      if (!filteredCommands.includes(oxlintCommand)) {
        filteredCommands.push(oxlintCommand);
      }
      updatedLintStaged[matchingPattern] = filteredCommands;
    } else {
      // 没有匹配的模式，添加新模式
      updatedLintStaged[oxlintPattern] = [oxlintCommand];
    }
  }

  pkg['lint-staged'] = updatedLintStaged;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  log('✓ lint-staged 配置已更新', 'green');

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
      await installDependencies(['husky'], true);
      // 安装后重新读取 package.json 以获取最新状态
      pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      // 在 package.json 中添加 prepare 脚本（husky 推荐方式）
      if (!pkg.scripts) {
        pkg.scripts = {};
      }
      if (!pkg.scripts.prepare) {
        pkg.scripts.prepare = 'husky';
        writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
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
      writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
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
      // 如果没有 pre-commit hook，创建一个
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

  return true;
}
