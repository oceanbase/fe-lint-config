import { existsSync, readFileSync } from 'fs';

// 检测 Prettier 相关依赖和配置
export function detectPrettier() {
  const result = {
    hasPrettier: false,
    hasPrettierConfig: false,
    prettierConfigFile: null,
    prettierPackages: [],
  };

  // 检测 package.json 中的 prettier 依赖
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      const prettierPackages = [
        'prettier',
        'eslint-config-prettier',
        'eslint-plugin-prettier',
      ];
      result.prettierPackages = prettierPackages.filter(
        (pkgName) => allDeps[pkgName],
      );
      result.hasPrettier = result.prettierPackages.length > 0;
    } catch (error) {
      // 忽略错误
    }
  }

  // 检测 Prettier 配置文件
  const prettierConfigFiles = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.mjs',
    '.prettierrc.yaml',
    '.prettierrc.yml',
    '.prettierrc.toml',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs',
    'prettier.config.json',
  ];

  for (const file of prettierConfigFiles) {
    if (existsSync(file)) {
      result.hasPrettierConfig = true;
      result.prettierConfigFile = file;
      break;
    }
  }

  return result;
}

// 检查 Prettier 配置中的不支持的字段
export function checkUnsupportedPrettierOptions(prettierConfig) {
  const warnings = [];

  // 检查不支持的选项
  const unsupportedOptions = [
    'experimentalTernaries',
    'experimentalOperatorPosition',
  ];

  for (const option of unsupportedOptions) {
    if (prettierConfig[option] !== undefined) {
      warnings.push(`- ${option}: oxfmt 不支持此选项`);
    }
  }

  // 检查 override 字段
  if (prettierConfig.overrides !== undefined) {
    warnings.push('- overrides: oxfmt 不支持嵌套配置');
  }

  // 检查 plugins
  if (prettierConfig.plugins !== undefined) {
    warnings.push(
      '- plugins: oxfmt 不支持 Prettier 插件（如需 import 排序，可使用 experimentalSortImports）',
    );
  }

  return warnings;
}

// 检查 package.json 中的 prettier 字段
export function checkPackageJsonPrettierField() {
  if (!existsSync('package.json')) {
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    return pkg.prettier !== undefined;
  } catch {
    return false;
  }
}

// 检查是否存在 .editorconfig
export function checkEditorConfig() {
  return existsSync('.editorconfig');
}
