// 生成 Stylelint 配置
export function generateStylelintConfig(options = {}) {
  const { rules = {} } = options;

  return `// .stylelintrc.mjs
import { OBStylelintCfg } from '@oceanbase/lint-config';

export default OBStylelintCfg({
  rules: {
${Object.entries(rules)
  .map(([rule, value]) => {
    const valueStr =
      typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
    return `    "${rule}": ${valueStr},`;
  })
  .join('\n')}
  }
});
`;
}
