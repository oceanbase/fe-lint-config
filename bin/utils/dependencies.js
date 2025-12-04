import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

import { log } from './cli.js';

// 检测包管理器
export function detectPackageManager() {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

// 安装依赖
export function installDependencies(packages, dev = true) {
  const pm = detectPackageManager();
  let command;

  if (pm === 'pnpm') {
    command = dev
      ? `pnpm add --save-dev ${packages.join(' ')}`
      : `pnpm add ${packages.join(' ')}`;
  } else if (pm === 'yarn') {
    command = dev
      ? `yarn add --dev ${packages.join(' ')}`
      : `yarn add ${packages.join(' ')}`;
  } else {
    command = dev
      ? `npm install --save-dev ${packages.join(' ')}`
      : `npm install ${packages.join(' ')}`;
  }

  log(`\n正在安装依赖: ${packages.join(', ')}`, 'yellow');
  try {
    execSync(command, { stdio: 'inherit' });
    log('✓ 依赖安装成功', 'green');
    return true;
  } catch (error) {
    log('✗ 依赖安装失败', 'yellow');
    return false;
  }
}

// 卸载依赖
export function uninstallDependencies(packages) {
  const pm = detectPackageManager();

  let command;
  if (pm === 'pnpm') {
    command = `pnpm remove ${packages.join(' ')}`;
  } else if (pm === 'yarn') {
    command = `yarn remove ${packages.join(' ')}`;
  } else {
    command = `npm uninstall ${packages.join(' ')}`;
  }

  log(`\n正在卸载依赖: ${packages.join(', ')}`, 'yellow');
  try {
    execSync(command, { stdio: 'inherit' });
    log('✓ 依赖卸载成功', 'green');
    return true;
  } catch (error) {
    log('✗ 依赖卸载失败', 'yellow');
    return false;
  }
}

// 检测 ESLint/Prettier 相关依赖
export function detectESLintPrettierDependencies() {
  if (!existsSync('package.json')) {
    return [];
  }

  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const eslintPrettierPackages = [
      'eslint',
      '@eslint/js',
      'typescript-eslint',
      '@typescript-eslint/parser',
      '@typescript-eslint/eslint-plugin',
      'eslint-config-prettier',
      'eslint-plugin-prettier',
      'eslint-plugin-react',
      'eslint-plugin-react-hooks',
      'eslint-plugin-import',
      'eslint-import-resolver-typescript',
      'eslint-flat-config-utils',
      'prettier',
    ];

    const foundPackages = eslintPrettierPackages.filter(
      (pkgName) => allDeps[pkgName],
    );

    return foundPackages;
  } catch (error) {
    log(`⚠️  读取 package.json 失败: ${error.message}`, 'yellow');
    return [];
  }
}

// 收集需要安装的依赖
export function collectDependencies(
  options,
  hasESLintConfig = false,
  hasMigratedRules = false,
) {
  const { useESLint, useOxlint, useStylelint, usePrettier } = options;

  const packages = [];

  // 只有使用 ESLint 时才需要安装 @oceanbase/lint-config
  if (useESLint) {
    packages.push('@oceanbase/lint-config');
    // ESLint 核心包（@oceanbase/lint-config 的 dependencies 中不包含，需要单独安装）
    packages.push('eslint@^9.15.0');

    // Prettier（如果启用，需要单独安装，因为不是所有项目都需要）
    // 注意：eslint-plugin-prettier 和 eslint-config-prettier 已在 @oceanbase/lint-config 的 dependencies 中
    if (usePrettier) {
      packages.push('prettier@^3.4.2');
    }

    // 以下依赖已在 @oceanbase/lint-config 的 dependencies 中，安装 @oceanbase/lint-config 时会自动安装：
    // - @eslint/js
    // - typescript-eslint, @typescript-eslint/parser (如果使用 TypeScript)
    // - eslint-plugin-react, eslint-plugin-react-hooks (如果使用 React)
    // - eslint-plugin-import, eslint-import-resolver-typescript (如果启用 import)
    // - eslint-plugin-prettier, eslint-config-prettier (如果启用 Prettier)
  }

  if (useOxlint) {
    packages.push('oxlint');
    // 如果检测到 ESLint 配置且有迁移的规则，需要安装迁移工具
    if (hasESLintConfig && hasMigratedRules) {
      packages.push('@oxlint/migrate');
    }
  }

  if (useStylelint) {
    // Stylelint 相关依赖都需要用户项目独立安装
    // 因为 Stylelint 通过字符串引用配置包，需要从项目根目录的 node_modules 中解析
    packages.push('stylelint@^16.18.0');
    packages.push('stylelint-config-standard@^38.0.0');
    packages.push('stylelint-config-recommended-less@^3.0.1');
    packages.push('stylelint-less@^3.0.1');
    packages.push('postcss-less@^6.0.0');
  }

  return packages;
}
