import { createInterface } from 'readline';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

export function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查 Node 版本
export function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 21) {
    log(`\n⚠️  警告: 当前 Node.js 版本为 ${nodeVersion}`, 'yellow');
    log('  推荐使用 Node.js 21+ (LTS 版本)', 'yellow');
    log('  可以使用以下命令安装 LTS 版本:', 'blue');
    log('    nvm install --lts', 'blue');
    log('    nvm use --lts', 'blue');
    log('  或访问: https://nodejs.org/\n', 'blue');
    return false;
  }
  return true;
}

// 交互式选择
export function select(questionText, choices) {
  return new Promise((resolve) => {
    const ask = () => {
      log(`\n${questionText}`, 'cyan');
      choices.forEach((choice, index) => {
        log(`  ${index + 1}. ${choice}`, 'blue');
      });

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('\n请选择 (输入数字): ', (answer) => {
        rl.close();
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < choices.length) {
          resolve(index);
        } else {
          log('无效的选择，请重试', 'yellow');
          ask();
        }
      });
    };
    ask();
  });
}

// 确认提示
export function confirm(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

