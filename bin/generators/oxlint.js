// 生成基础 Oxlint 配置（不包含迁移的规则）
export function generateBaseOxlintConfig(options) {
  const { typescript, react } = options;

  const config = {
    $schema:
      'https://raw.githubusercontent.com/oxc-project/oxc/main/crates/oxc_linter/src/schemas/oxlintrc.schema.json',
    plugins: [],
    rules: {},
  };

  if (typescript) {
    config.plugins.push('typescript');
  }
  if (react) {
    config.plugins.push('react');
  }
  config.plugins.push('oxc');

  return config;
}

// 删除 JSON 配置中的注释（这些注释被作为键值对存在）
export function removeCommentsFromConfig(config) {
  let hasChanges = false;

  // 删除主 rules 对象中的注释键
  if (config.rules) {
    const keysToDelete = [];
    for (const key in config.rules) {
      // 检查是否是注释键（以 // 开头或包含"注释"字样）
      if (
        key.startsWith('//') ||
        key.includes('=====') ||
        (typeof config.rules[key] === 'string' &&
          config.rules[key].includes('注释'))
      ) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => {
      delete config.rules[key];
      hasChanges = true;
    });
  }

  // 删除 overrides 中的注释键
  if (config.overrides && Array.isArray(config.overrides)) {
    for (const override of config.overrides) {
      if (override.rules) {
        const keysToDelete = [];
        for (const key in override.rules) {
          // 检查是否是注释键
          if (
            key.startsWith('//') ||
            key.includes('=====') ||
            (typeof override.rules[key] === 'string' &&
              override.rules[key].includes('注释'))
          ) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => {
          delete override.rules[key];
          hasChanges = true;
        });
      }
    }
  }

  return hasChanges;
}

// 修复 react-hooks 规则前缀（oxlint 中已归类到 react）
export function fixReactHooksRules(config) {
  // 需要修复的规则映射
  const rulesToFix = {
    'react-hooks/exhaustive-deps': 'react/exhaustive-deps',
    'react-hooks/rules-of-hooks': 'react/rules-of-hooks',
  };

  let hasChanges = false;

  // 修复主 rules 对象
  if (config.rules) {
    for (const [oldRule, newRule] of Object.entries(rulesToFix)) {
      if (oldRule in config.rules) {
        config.rules[newRule] = config.rules[oldRule];
        delete config.rules[oldRule];
        hasChanges = true;
      }
    }
  }

  // 修复 overrides 中的 rules
  if (config.overrides && Array.isArray(config.overrides)) {
    for (const override of config.overrides) {
      if (override.rules) {
        for (const [oldRule, newRule] of Object.entries(rulesToFix)) {
          if (oldRule in override.rules) {
            override.rules[newRule] = override.rules[oldRule];
            delete override.rules[oldRule];
            hasChanges = true;
          }
        }
      }
    }
  }

  return hasChanges;
}

// 补充 TypeScript 和 React 插件支持
export function ensurePluginsSupport(config, useTypeScript, useReact) {
  let hasChanges = false;

  // 确保 plugins 数组存在
  if (!config.plugins) {
    config.plugins = [];
  }

  // 检查并添加 TypeScript 插件
  if (useTypeScript && !config.plugins.includes('typescript')) {
    config.plugins.push('typescript');
    hasChanges = true;
  }

  // 检查并添加 React 插件
  if (useReact && !config.plugins.includes('react')) {
    config.plugins.push('react');
    hasChanges = true;
  }

  // 确保有 oxc 插件
  if (!config.plugins.includes('oxc')) {
    config.plugins.push('oxc');
    hasChanges = true;
  }

  return hasChanges;
}
