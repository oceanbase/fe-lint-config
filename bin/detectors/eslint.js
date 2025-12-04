import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { log } from '../utils/cli.js';

// 检测旧的 ESLint 配置文件
export function detectOldESLintConfig() {
  const configFiles = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.cjs',
    'eslint.config.mjs',
  ];

  for (const file of configFiles) {
    if (existsSync(file)) {
      return file;
    }
  }

  // 检查 package.json 中的 eslintConfig
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      if (pkg.eslintConfig) {
        return 'package.json';
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  return null;
}

// 解析旧的 ESLint 配置
export async function parseOldESLintConfig(configFile) {
  try {
    if (configFile === 'package.json') {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      return pkg.eslintConfig;
    }

    const content = readFileSync(configFile, 'utf-8');

    // 处理 .eslintrc（无后缀，通常是 JSON 格式）
    if (configFile === '.eslintrc') {
      try {
        return JSON.parse(content);
      } catch (error) {
        log('⚠️  .eslintrc 文件解析失败，请确保是有效的 JSON 格式', 'yellow');
        return null;
      }
    }

    if (configFile.endsWith('.json')) {
      return JSON.parse(content);
    }

    if (configFile.endsWith('.yaml') || configFile.endsWith('.yml')) {
      // 简单解析，实际应该使用 yaml 库
      log('⚠️  YAML 配置文件需要手动迁移', 'yellow');
      return null;
    }

    // 对于 JS 文件，尝试动态导入
    if (
      configFile.endsWith('.js') ||
      configFile.endsWith('.cjs') ||
      configFile.endsWith('.mjs')
    ) {
      const filePath = resolve(process.cwd(), configFile);

      if (configFile.endsWith('.mjs')) {
        // ES Module - 需要 file:// 协议和绝对路径
        const moduleUrl = `file://${filePath}`;
        const module = await import(moduleUrl);
        return module.default || module;
      } else {
        // CommonJS - 使用 require
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        return require(filePath);
      }
    }

    return JSON.parse(content);
  } catch (error) {
    log(`⚠️  解析配置文件失败: ${error.message}`, 'yellow');
    if (
      configFile.endsWith('.js') ||
      configFile.endsWith('.cjs') ||
      configFile.endsWith('.mjs')
    ) {
      log(
        '  提示: 如果配置使用了 require.resolve，请确保相关依赖已安装',
        'yellow',
      );
    }
    return null;
  }
}

// 迁移 ESLint 规则
export function migrateESLintRules(oldConfig) {
  if (!oldConfig) return { rules: {}, extends: [], plugins: [] };

  // 处理 flat config 格式（数组格式）
  if (Array.isArray(oldConfig)) {
    const allRules = {};
    // 遍历所有配置项，收集规则
    for (const configItem of oldConfig) {
      if (configItem && configItem.rules) {
        Object.assign(allRules, configItem.rules);
      }
    }
    return {
      rules: allRules,
      extends: [],
      plugins: [],
    };
  }

  // 处理传统格式
  const migrated = {
    rules: oldConfig.rules || {},
    extends: oldConfig.extends || [],
    plugins: oldConfig.plugins || [],
  };

  // 处理 extends 数组
  if (typeof migrated.extends === 'string') {
    migrated.extends = [migrated.extends];
  }

  return migrated;
}

