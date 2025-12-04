// 生成 ESLint 配置（支持规则迁移）
export function generateESLintConfig(options) {
  const {
    typescript,
    react,
    prettier,
    import: importPlugin,
    rules = {},
  } = options;

  let config = `// eslint.config.mjs
import { OBEslintCfg } from '@oceanbase/lint-config';

export default OBEslintCfg(
  {
`;

  if (typescript) {
    config += `    typescript: true,\n`;
  }
  if (react) {
    config += `    react: true,\n`;
  }
  if (prettier) {
    config += `    prettier: true,\n`;
  }
  if (importPlugin) {
    config += `    import: true,\n`;
  }

  config += `  }`;

  // 添加自定义规则覆盖
  if (rules && Object.keys(rules).length > 0) {
    config += `,\n  {\n    rules: {\n`;
    for (const [rule, value] of Object.entries(rules)) {
      const valueStr =
        typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      config += `      "${rule}": ${valueStr},\n`;
    }
    config += `    },\n  }`;
  }

  config += `\n);\n`;

  return config;
}
