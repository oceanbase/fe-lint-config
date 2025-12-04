import { existsSync, readFileSync, writeFileSync } from 'fs';

import { confirm, log } from '../utils/cli.js';
import { installDependencies } from '../utils/dependencies.js';

/**
 * 检测 ESLint 配置类型和格式
 * @returns {Object} { configType: 'OBEslintCfg' | 'flat' | 'legacy' | null, configFile: string | null, eslintVersion: number | null }
 */
function detectESLintConfigType() {
  const flatConfigFiles = [
    'eslint.config.js',
    'eslint.config.cjs',
    'eslint.config.mjs',
  ];
  const legacyConfigFiles = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
  ];

  // 检测 ESLint 版本
  let eslintVersion = null;
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const eslintVersionStr = allDeps.eslint;
      if (eslintVersionStr) {
        // 提取主版本号，例如 "9.15.0" -> 9, "^9.15.0" -> 9
        const match = eslintVersionStr.match(/^[\^~]?(\d+)/);
        if (match) {
          eslintVersion = parseInt(match[1], 10);
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  // 优先检测 flat config
  for (const file of flatConfigFiles) {
    if (existsSync(file)) {
      // 读取文件内容，检查是否使用了 OBEslintCfg
      try {
        const content = readFileSync(file, 'utf-8');
        if (
          content.includes('OBEslintCfg') ||
          content.includes('@oceanbase/lint-config')
        ) {
          return {
            configType: 'OBEslintCfg',
            configFile: file,
            eslintVersion,
          };
        }
      } catch (error) {
        // 忽略读取错误
      }
      return {
        configType: 'flat',
        configFile: file,
        eslintVersion,
      };
    }
  }

  // 检测 legacy config
  for (const file of legacyConfigFiles) {
    if (existsSync(file)) {
      return {
        configType: 'legacy',
        configFile: file,
        eslintVersion,
      };
    }
  }

  return { configType: null, configFile: null, eslintVersion };
}

/**
 * 修改 OBEslintCfg 形式的 ESLint 配置
 * @param {string} configFile - 配置文件路径
 * @param {boolean} hasOxlintConfig - 是否有 .oxlintrc.json
 * @returns {boolean} 是否成功修改
 */
function modifyOBEslintCfgConfig(configFile, hasOxlintConfig) {
  try {
    let content = readFileSync(configFile, 'utf-8');

    // 检查是否已经导入了 eslint-plugin-oxlint
    if (
      content.includes('eslint-plugin-oxlint') ||
      content.includes('oxlint')
    ) {
      log('⚠️  配置文件中已包含 eslint-plugin-oxlint，跳过修改', 'yellow');
      return false;
    }

    // 检测文件类型（.mjs, .js, .cjs）
    const isMJS = configFile.endsWith('.mjs');
    const isCJS = configFile.endsWith('.cjs');

    let importStatement = '';
    let configStatement = '';

    if (isMJS) {
      // ES Module
      importStatement = "import oxlint from 'eslint-plugin-oxlint';\n";
      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    } else if (isCJS) {
      // CommonJS
      importStatement = "const oxlint = require('eslint-plugin-oxlint');\n";
      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    } else {
      // .js 文件，需要根据 package.json 判断
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const isESM = pkg.type === 'module';

      if (isESM) {
        importStatement = "import oxlint from 'eslint-plugin-oxlint';\n";
      } else {
        importStatement = "const oxlint = require('eslint-plugin-oxlint');\n";
      }

      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    }

    let modifiedContent = content;

    // 1. 添加 import 语句
    const importRegex = /^import[\s\S]*?from[\s\S]*?;$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      // 在最后一个 import 后添加
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      modifiedContent =
        content.slice(0, lastImportIndex + lastImport.length) +
        '\n' +
        importStatement.trim() +
        content.slice(lastImportIndex + lastImport.length);
    } else {
      // 没有 import，在文件开头添加
      modifiedContent = importStatement.trim() + '\n\n' + content;
    }

    // 2. 修改 export default，将 oxlint 配置作为 OBEslintCfg 的第二个参数
    // 根据 README 和源码，OBEslintCfg 的第一个参数是配置对象，从第二个参数开始可以接受自定义配置
    if (modifiedContent.includes('export default OBEslintCfg(')) {
      // 找到 OBEslintCfg( 的位置
      const obEslintCfgIndex = modifiedContent.indexOf('OBEslintCfg(');
      if (obEslintCfgIndex === -1) {
        log('⚠️  未找到 OBEslintCfg 调用', 'yellow');
        return false;
      }

      // 找到匹配的右括号（需要考虑嵌套的括号）
      let parenCount = 0;
      let lastParamEnd = -1;
      let inString = false;
      let stringChar = '';

      for (
        let i = obEslintCfgIndex + 'OBEslintCfg('.length;
        i < modifiedContent.length;
        i++
      ) {
        const char = modifiedContent[i];

        if (!inString) {
          if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
          } else if (char === '(') {
            parenCount++;
          } else if (char === ')') {
            if (parenCount === 0) {
              lastParamEnd = i;
              break;
            }
            parenCount--;
          }
        } else {
          if (char === stringChar && modifiedContent[i - 1] !== '\\') {
            inString = false;
          }
        }
      }

      if (lastParamEnd === -1) {
        log('⚠️  无法找到 OBEslintCfg 调用的结束位置', 'yellow');
        return false;
      }

      // 获取参数内容（不包括括号）
      const paramsContent = modifiedContent
        .slice(obEslintCfgIndex + 'OBEslintCfg('.length, lastParamEnd)
        .trim();

      // 检查是否已经有参数
      if (paramsContent) {
        // 如果最后一个参数不是以逗号结尾，需要添加逗号
        // 检查最后几行，看是否有逗号
        const lastLines = paramsContent.split('\n').slice(-3).join('\n');
        const needsComma =
          !lastLines.trim().endsWith(',') && lastLines.trim().length > 0;
        const comma = needsComma ? ',' : '';

        // 在最后一个参数后添加 oxlint 配置
        modifiedContent =
          modifiedContent.slice(0, lastParamEnd) +
          comma +
          '\n' +
          configStatement.trim() +
          modifiedContent.slice(lastParamEnd);
      } else {
        // 没有参数，直接添加 oxlint 配置作为第一个参数（但这种情况不太可能）
        const openParenIndex = obEslintCfgIndex + 'OBEslintCfg('.length;
        modifiedContent =
          modifiedContent.slice(0, openParenIndex) +
          '\n' +
          configStatement.trim() +
          modifiedContent.slice(openParenIndex);
      }
    } else if (modifiedContent.includes('export default')) {
      // 如果不是 OBEslintCfg 形式，可能是其他格式
      log('⚠️  检测到 export default，但未找到 OBEslintCfg 调用', 'yellow');
      log('   请手动将 oxlint 配置添加到 OBEslintCfg 的第二个参数', 'blue');
      return false;
    } else {
      // 没有 export default，不应该发生
      log('⚠️  未找到 export default 语句', 'yellow');
      return false;
    }

    writeFileSync(configFile, modifiedContent);
    log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
    log(
      '   配置方式: OBEslintCfg 形式（已将 oxlint 配置作为第二个参数添加）',
      'blue',
    );
    return true;
  } catch (error) {
    log(`✗ 修改 ESLint 配置失败: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * 修改 flat config 格式的 ESLint 配置（非 OBEslintCfg）
 * @param {string} configFile - 配置文件路径
 * @param {boolean} hasOxlintConfig - 是否有 .oxlintrc.json
 * @returns {boolean} 是否成功修改
 */
function modifyFlatConfig(configFile, hasOxlintConfig) {
  try {
    let content = readFileSync(configFile, 'utf-8');

    // 检查是否已经导入了 eslint-plugin-oxlint
    if (
      content.includes('eslint-plugin-oxlint') ||
      content.includes('oxlint')
    ) {
      log('⚠️  配置文件中已包含 eslint-plugin-oxlint，跳过修改', 'yellow');
      return false;
    }

    // 检测文件类型（.mjs, .js, .cjs）
    const isMJS = configFile.endsWith('.mjs');
    const isCJS = configFile.endsWith('.cjs');

    let importStatement = '';
    let configStatement = '';

    if (isMJS) {
      // ES Module
      importStatement = "import oxlint from 'eslint-plugin-oxlint';\n";
      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    } else if (isCJS) {
      // CommonJS
      importStatement = "const oxlint = require('eslint-plugin-oxlint');\n";
      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    } else {
      // .js 文件，需要根据 package.json 判断
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
      const isESM = pkg.type === 'module';

      if (isESM) {
        importStatement = "import oxlint from 'eslint-plugin-oxlint';\n";
      } else {
        importStatement = "const oxlint = require('eslint-plugin-oxlint');\n";
      }

      if (hasOxlintConfig) {
        configStatement =
          "  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),\n";
      } else {
        configStatement = "  ...oxlint.configs['flat/recommended'],\n";
      }
    }

    // 查找 export default 或 module.exports
    let modifiedContent = content;

    // 1. 添加 import 语句
    if (
      isMJS ||
      (configFile.endsWith('.js') && content.includes('export default'))
    ) {
      // ES Module
      // 查找所有 import 语句
      const importRegex = /^import[\s\S]*?from[\s\S]*?;$/gm;
      const imports = content.match(importRegex);

      if (imports && imports.length > 0) {
        // 在最后一个 import 后添加
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        modifiedContent =
          content.slice(0, lastImportIndex + lastImport.length) +
          '\n' +
          importStatement.trim() +
          content.slice(lastImportIndex + lastImport.length);
      } else {
        // 没有 import，在文件开头添加
        modifiedContent = importStatement.trim() + '\n\n' + content;
      }

      // 2. 在 export default 数组中添加 oxlint 配置（作为最后一个）
      if (modifiedContent.includes('export default [')) {
        // 找到 export default [...] 的位置
        const exportDefaultMatch = modifiedContent.match(
          /export default \[([\s\S]*?)\];?$/m,
        );
        if (exportDefaultMatch) {
          const arrayContent = exportDefaultMatch[1];
          const arrayStart = modifiedContent.indexOf('export default [');
          const arrayEnd = modifiedContent.indexOf(
            ']',
            arrayStart + 'export default ['.length,
          );

          // 检查数组内容是否以逗号结尾
          const needsComma =
            arrayContent.trim() && !arrayContent.trim().endsWith(',');
          const comma = needsComma ? ',' : '';

          // 在数组末尾添加 oxlint 配置
          modifiedContent =
            modifiedContent.slice(0, arrayEnd) +
            comma +
            '\n' +
            configStatement.trim() +
            modifiedContent.slice(arrayEnd);
        }
      } else if (modifiedContent.includes('export default')) {
        // 如果不是数组，需要转换为数组
        // 匹配 export default 后面的内容（可能是函数调用、对象、数组等）
        const exportMatch = modifiedContent.match(
          /export default ([\s\S]*?);?$/m,
        );
        if (exportMatch) {
          const exportValue = exportMatch[1].trim();
          // 将单个配置对象/函数调用包装成数组
          modifiedContent = modifiedContent.replace(
            /export default [\s\S]*?;?$/m,
            `export default [\n  ${exportValue},\n${configStatement.trim()}\n];`,
          );
        }
      } else {
        // 没有 export default，需要添加
        modifiedContent +=
          '\n\nexport default [\n' + configStatement.trim() + '\n];\n';
      }
    } else {
      // CommonJS
      // 查找所有 require 语句
      const requireRegex = /^(const|let|var)[\s\S]*?require\([\s\S]*?\);$/gm;
      const requires = content.match(requireRegex);

      if (requires && requires.length > 0) {
        // 在最后一个 require 后添加
        const lastRequire = requires[requires.length - 1];
        const lastRequireIndex = content.lastIndexOf(lastRequire);
        modifiedContent =
          content.slice(0, lastRequireIndex + lastRequire.length) +
          '\n' +
          importStatement.trim() +
          content.slice(lastRequireIndex + lastRequire.length);
      } else {
        modifiedContent = importStatement.trim() + '\n\n' + content;
      }

      // 修改 module.exports
      if (modifiedContent.includes('module.exports = [')) {
        const moduleExportsMatch = modifiedContent.match(
          /module\.exports = \[([\s\S]*?)\];?$/m,
        );
        if (moduleExportsMatch) {
          const arrayContent = moduleExportsMatch[1];
          const arrayStart = modifiedContent.indexOf('module.exports = [');
          const arrayEnd = modifiedContent.indexOf(
            ']',
            arrayStart + 'module.exports = ['.length,
          );

          const needsComma =
            arrayContent.trim() && !arrayContent.trim().endsWith(',');
          const comma = needsComma ? ',' : '';

          modifiedContent =
            modifiedContent.slice(0, arrayEnd) +
            comma +
            '\n' +
            configStatement.trim() +
            modifiedContent.slice(arrayEnd);
        }
      } else if (modifiedContent.includes('module.exports = {')) {
        // 如果是对象，转换为数组
        const objMatch = modifiedContent.match(
          /module\.exports = \{([\s\S]*?)\};?$/m,
        );
        if (objMatch) {
          const objContent = objMatch[1].trim();
          modifiedContent = modifiedContent.replace(
            /module\.exports = \{[\s\S]*?\};?$/m,
            `module.exports = [\n  ${objContent},\n${configStatement.trim()}\n];`,
          );
        }
      } else if (modifiedContent.includes('module.exports =')) {
        // 其他格式的 module.exports
        const moduleExportsMatch = modifiedContent.match(
          /module\.exports = ([\s\S]*?);?$/m,
        );
        if (moduleExportsMatch) {
          const exportValue = moduleExportsMatch[1].trim();
          modifiedContent = modifiedContent.replace(
            /module\.exports = [\s\S]*?;?$/m,
            `module.exports = [\n  ${exportValue},\n${configStatement.trim()}\n];`,
          );
        }
      } else {
        // 没有 module.exports，添加
        modifiedContent +=
          '\n\nmodule.exports = [\n' + configStatement.trim() + '\n];\n';
      }
    }

    writeFileSync(configFile, modifiedContent);
    log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
    log('   配置方式: Flat Config (ESLint v9)', 'blue');
    return true;
  } catch (error) {
    log(`✗ 修改 ESLint 配置失败: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * 修改 legacy config 格式的 ESLint 配置
 * @param {string} configFile - 配置文件路径
 * @returns {boolean} 是否成功修改
 */
function modifyLegacyConfig(configFile) {
  try {
    let content = readFileSync(configFile, 'utf-8');

    // 检查是否已经包含了 plugin:oxlint
    if (
      content.includes('plugin:oxlint') ||
      content.includes('eslint-plugin-oxlint')
    ) {
      log('⚠️  配置文件中已包含 eslint-plugin-oxlint，跳过修改', 'yellow');
      return false;
    }

    // 根据文件类型处理
    if (configFile.endsWith('.json') || !configFile.includes('.')) {
      // JSON 格式
      const config = JSON.parse(content);
      if (!config.extends) {
        config.extends = [];
      }
      if (!Array.isArray(config.extends)) {
        config.extends = [config.extends];
      }
      if (!config.extends.includes('plugin:oxlint/recommended')) {
        config.extends.push('plugin:oxlint/recommended');
      }
      writeFileSync(configFile, JSON.stringify(config, null, 2));
    } else if (
      configFile.endsWith('.js') ||
      configFile.endsWith('.cjs') ||
      configFile.endsWith('.mjs')
    ) {
      // JavaScript 格式
      // 尝试自动修改简单的配置格式
      let modified = false;

      // 模式 1: module.exports = { extends: [...] }
      if (content.includes('module.exports') && content.includes('extends')) {
        // 匹配 extends 数组
        const extendsArrayRegex = /extends\s*:\s*\[([\s\S]*?)\]/;
        const extendsStringRegex = /extends\s*:\s*['"]([^'"]+)['"]/;
        const extendsArrayMatch = content.match(extendsArrayRegex);
        const extendsStringMatch = content.match(extendsStringRegex);

        if (extendsArrayMatch) {
          // extends 是数组格式
          const arrayContent = extendsArrayMatch[1];
          // 检查是否已包含 plugin:oxlint/recommended
          if (!arrayContent.includes('plugin:oxlint/recommended')) {
            // 在数组末尾添加
            const needsComma =
              arrayContent.trim() && !arrayContent.trim().endsWith(',');
            const comma = needsComma ? ',' : '';
            const newArrayContent =
              arrayContent + comma + '\n      "plugin:oxlint/recommended"';
            content = content.replace(
              extendsArrayRegex,
              `extends: [${newArrayContent}]`,
            );
            modified = true;
          }
        } else if (extendsStringMatch) {
          // extends 是字符串格式，转换为数组
          const extendsValue = extendsStringMatch[1];
          content = content.replace(
            extendsStringRegex,
            `extends: [\n      "${extendsValue}",\n      "plugin:oxlint/recommended"\n    ]`,
          );
          modified = true;
        } else if (content.includes('extends:')) {
          // 有 extends 但格式不匹配，尝试在 extends 后添加
          // 这种情况比较复杂，可能需要手动修改
          log('⚠️  检测到 extends 配置，但格式较复杂，无法自动修改', 'yellow');
          log(
            '   请在 extends 数组中添加: "plugin:oxlint/recommended"',
            'blue',
          );
          return false;
        }
      }

      // 模式 2: export default { extends: [...] } (ES Module)
      if (
        !modified &&
        content.includes('export default') &&
        content.includes('extends')
      ) {
        const extendsArrayRegex = /extends\s*:\s*\[([\s\S]*?)\]/;
        const extendsStringRegex = /extends\s*:\s*['"]([^'"]+)['"]/;
        const extendsArrayMatch = content.match(extendsArrayRegex);
        const extendsStringMatch = content.match(extendsStringRegex);

        if (extendsArrayMatch) {
          const arrayContent = extendsArrayMatch[1];
          if (!arrayContent.includes('plugin:oxlint/recommended')) {
            const needsComma =
              arrayContent.trim() && !arrayContent.trim().endsWith(',');
            const comma = needsComma ? ',' : '';
            const newArrayContent =
              arrayContent + comma + '\n      "plugin:oxlint/recommended"';
            content = content.replace(
              extendsArrayRegex,
              `extends: [${newArrayContent}]`,
            );
            modified = true;
          }
        } else if (extendsStringMatch) {
          const extendsValue = extendsStringMatch[1];
          content = content.replace(
            extendsStringRegex,
            `extends: [\n      "${extendsValue}",\n      "plugin:oxlint/recommended"\n    ]`,
          );
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(configFile, content);
        log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
        log('   配置方式: Legacy Config (ESLint < v9)', 'blue');
        return true;
      } else {
        // 无法自动修改，提供指导
        log(
          '⚠️  JavaScript 格式的配置文件包含复杂逻辑，无法自动修改',
          'yellow',
        );
        log('   请在 extends 数组中添加: "plugin:oxlint/recommended"', 'blue');
        log('   示例:', 'blue');
        log('   module.exports = {', 'blue');
        log('     extends: [', 'blue');
        log('       "eslint:recommended",', 'blue');
        log('       "plugin:oxlint/recommended"  // 添加这一行', 'blue');
        log('     ]', 'blue');
        log('   };', 'blue');
        return false;
      }
    } else {
      // YAML 格式
      // 尝试简单的字符串匹配（不依赖 YAML 库）
      if (
        content.includes('extends:') &&
        !content.includes('plugin:oxlint/recommended')
      ) {
        // 尝试匹配 extends 数组格式
        const extendsArrayRegex = /extends:\s*\n\s*-\s*([^\n]+)/g;
        const extendsStringRegex = /extends:\s*['"]([^'"]+)['"]/;

        if (content.match(extendsArrayRegex)) {
          // YAML 数组格式: extends:\n  - "xxx"
          const lastExtendsMatch = [
            ...content.matchAll(extendsArrayRegex),
          ].pop();
          if (lastExtendsMatch) {
            const insertIndex =
              lastExtendsMatch.index + lastExtendsMatch[0].length;
            content =
              content.slice(0, insertIndex) +
              '\n  - "plugin:oxlint/recommended"' +
              content.slice(insertIndex);
            writeFileSync(configFile, content);
            log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
            log('   配置方式: Legacy Config (ESLint < v9)', 'blue');
            return true;
          }
        } else if (content.match(extendsStringRegex)) {
          // YAML 字符串格式: extends: "xxx"
          const match = content.match(extendsStringRegex);
          if (match) {
            const extendsValue = match[1];
            content = content.replace(
              extendsStringRegex,
              `extends:\n  - "${extendsValue}"\n  - "plugin:oxlint/recommended"`,
            );
            writeFileSync(configFile, content);
            log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
            log('   配置方式: Legacy Config (ESLint < v9)', 'blue');
            return true;
          }
        }
      }

      // 无法自动修改
      log('⚠️  YAML 格式的配置文件格式较复杂，无法自动修改', 'yellow');
      log('   请在 extends 数组中添加: "plugin:oxlint/recommended"', 'blue');
      log('   示例:', 'blue');
      log('   extends:', 'blue');
      log('     - "eslint:recommended"', 'blue');
      log('     - "plugin:oxlint/recommended"  # 添加这一行', 'blue');
      return false;
    }

    log(`✓ 已更新 ESLint 配置文件: ${configFile}`, 'green');
    log('   配置方式: Legacy Config (ESLint < v9)', 'blue');
    return true;
  } catch (error) {
    log(`✗ 修改 ESLint 配置失败: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * 更新 package.json 脚本
 * @returns {boolean} 是否成功更新
 */
function updatePackageScripts() {
  if (!existsSync('package.json')) {
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    if (!pkg.scripts) {
      pkg.scripts = {};
    }

    // 更新 lint 脚本
    if (pkg.scripts.lint) {
      // 如果已有 lint 脚本，检查是否已包含 oxlint
      if (!pkg.scripts.lint.includes('oxlint')) {
        pkg.scripts.lint = `npx oxlint && ${pkg.scripts.lint}`;
      }
    } else {
      pkg.scripts.lint = 'npx oxlint && npx eslint';
    }

    writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    log('✓ 已更新 package.json 脚本', 'green');
    log('   - lint: npx oxlint && npx eslint', 'blue');
    return true;
  } catch (error) {
    log(`✗ 更新 package.json 脚本失败: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * 设置 eslint-plugin-oxlint
 * @returns {Promise<Object>} { success: boolean, summary: Object }
 */
export async function setupESLintPluginOxlint() {
  const summary = {
    installedPackages: [],
    configFiles: [],
    scripts: [],
  };

  log('\n📦 步骤 1: 安装 eslint-plugin-oxlint', 'cyan');
  const installPlugin = await confirm('是否安装 eslint-plugin-oxlint?');
  if (!installPlugin) {
    log('已取消', 'yellow');
    return { success: false, summary };
  }

  const installed = await installDependencies(['eslint-plugin-oxlint'], true);
  if (!installed) {
    log(
      '✗ 安装失败，请手动安装: npm install --save-dev eslint-plugin-oxlint',
      'yellow',
    );
    return { success: false, summary };
  }
  summary.installedPackages.push('eslint-plugin-oxlint');

  log('\n📝 步骤 2: 修改 ESLint 配置文件', 'cyan');

  // 检测是否有 .oxlintrc.json
  const hasOxlintConfig = existsSync('.oxlintrc.json');
  if (hasOxlintConfig) {
    log('✓ 检测到 .oxlintrc.json 配置文件', 'green');
    log('   将使用 oxlint.buildFromOxlintConfigFile() 加载配置', 'blue');
  } else {
    log('ℹ️  未检测到 .oxlintrc.json 配置文件', 'blue');
    log("   将使用 oxlint.configs['flat/recommended'] 默认配置", 'blue');
  }

  // 检测 ESLint 配置类型
  const { configType, configFile, eslintVersion } = detectESLintConfigType();

  if (!configFile) {
    log('⚠️  未检测到 ESLint 配置文件', 'yellow');
    log(
      '   请先创建 ESLint 配置文件（推荐使用 flat config: eslint.config.mjs）',
      'yellow',
    );
    return { success: false, summary };
  }

  log(`✓ 检测到 ESLint 配置文件: ${configFile}`, 'green');

  // 显示配置类型信息
  if (configType === 'OBEslintCfg') {
    log('   配置类型: OBEslintCfg 形式 (@oceanbase/lint-config)', 'blue');
    if (eslintVersion) {
      log(`   ESLint 版本: v${eslintVersion}`, 'blue');
    }
  } else if (configType === 'flat') {
    log('   配置类型: Flat Config (ESLint v9)', 'blue');
    if (eslintVersion) {
      log(`   ESLint 版本: v${eslintVersion}`, 'blue');
    }
  } else {
    log('   配置类型: Legacy Config (ESLint < v9)', 'blue');
    if (eslintVersion) {
      log(`   ESLint 版本: v${eslintVersion}`, 'blue');
    }
    log('\n💡 推荐: 建议将配置迁移到 Flat Config 格式 (ESLint v9)', 'yellow');
    log('   使用以下命令可以自动迁移:', 'yellow');
    log('   npx @oceanbase/lint-config migrate-eslint-config', 'blue');
    log('   迁移后可以更好地使用 eslint-plugin-oxlint', 'yellow');
  }

  // 修改配置文件
  let configModified = false;
  if (configType === 'OBEslintCfg') {
    configModified = modifyOBEslintCfgConfig(configFile, hasOxlintConfig);
  } else if (configType === 'flat') {
    configModified = modifyFlatConfig(configFile, hasOxlintConfig);
  } else if (configType === 'legacy') {
    configModified = modifyLegacyConfig(configFile);
  }

  if (configModified) {
    summary.configFiles.push(configFile);
  }

  log('\n📝 步骤 3: 更新 package.json 脚本', 'cyan');
  const updateScripts = await confirm('是否更新 package.json 中的 lint 脚本?');
  if (updateScripts) {
    const scriptsUpdated = updatePackageScripts();
    if (scriptsUpdated) {
      summary.scripts.push('lint: npx oxlint && npx eslint');
    }
  }

  return { success: true, summary };
}
