import { existsSync, readFileSync } from 'fs';
import { log } from './cli.js';

// 检查是否在项目根目录
export function checkProjectRoot() {
  if (!existsSync('package.json')) {
    log('⚠️  错误: 未找到 package.json', 'red');
    log('  请确保在项目根目录运行此脚本', 'yellow');
    process.exit(1);
  }
}

