import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { log } from '../utils/cli.js';

// 检测旧的 Stylelint 配置文件
export function detectOldStylelintConfig() {
  const configFiles = [
    '.stylelintrc',
    '.stylelintrc.json',
    '.stylelintrc.js',
    '.stylelintrc.cjs',
    '.stylelintrc.mjs',
    '.stylelintrc.yaml',
    '.stylelintrc.yml',
    'stylelint.config.js',
    'stylelint.config.cjs',
    'stylelint.config.mjs',
    'stylelint.config.json',
  ];

  for (const file of configFiles) {
    if (existsSync(file)) {
      return file;
    }
  }

  // 检查 package.json 中的 stylelint 字段
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      if (pkg.stylelint) {
        return 'package.json';
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  return null;
}

// 解析旧的 Stylelint 配置
export async function parseOldStylelintConfig(file) {
  try {
    if (file === 'package.json') {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      return pkg.stylelint;
    }

    if (file.endsWith('.json')) {
      const content = readFileSync(file, 'utf-8');
      return JSON.parse(content);
    }

    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      log('⚠️  YAML 配置文件需要手动迁移', 'yellow');
      return null;
    }

    // 对于 JS/MJS 文件，尝试动态导入
    if (
      file.endsWith('.js') ||
      file.endsWith('.cjs') ||
      file.endsWith('.mjs')
    ) {
      const filePath = resolve(process.cwd(), file);

      if (file.endsWith('.mjs')) {
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

    return null;
  } catch (error) {
    log(`⚠️  解析配置文件失败: ${error.message}`, 'yellow');
    if (file.endsWith('.js') || file.endsWith('.mjs')) {
      log(
        '  提示: 如果配置使用了 require.resolve，请确保相关依赖已安装',
        'yellow',
      );
    }
    return null;
  }
}

// 迁移 Stylelint 配置
export async function migrateStylelintConfig(file) {
  const oldStylelintConfig = await parseOldStylelintConfig(file);
  if (!oldStylelintConfig) {
    return {};
  }

  const stylelintRules = oldStylelintConfig.rules || {};

  // 如果配置中有 extends，尝试解析扩展的配置
  if (oldStylelintConfig.extends) {
    const extendsList = Array.isArray(oldStylelintConfig.extends)
      ? oldStylelintConfig.extends
      : [oldStylelintConfig.extends];

    log(`  检测到 extends: ${extendsList.join(', ')}`, 'blue');
    log('  注意: extends 中的规则需要手动迁移', 'yellow');
  }

  log(`✓ 已提取 ${Object.keys(stylelintRules).length} 条规则`, 'green');

  return stylelintRules;
}
