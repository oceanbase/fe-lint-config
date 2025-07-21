import { StylelintOptions } from '@/types';

export function stylelint(options?: StylelintOptions) {
  const {
    overrides = {},
    extends: customExtends = [],
    ignores = [],
  } = options || {};
  return {
    ignoreFiles: ignores,
    extends: [
      'stylelint-config-standard',
      'stylelint-config-recommended-less',
      ...customExtends,
    ],
    plugins: ['stylelint-less'],
    overrides: [
      {
        files: ['**/*.less'],
        customSyntax: 'postcss-less',
      },
    ],
    rules: {
      'selector-class-pattern': null,
      'keyframes-name-pattern': null,
      'no-descending-specificity': null,
      'color-function-alias-notation': null,
      'declaration-property-value-no-unknown': [
        true,
        {
          ignoreProperties: {
            '/^.*$/': ['/@.*/', '/\\$.*/'],
          },
        },
      ], //忽略 less 中使用 @ 和 $ 开头的属性
      'color-function-notation': 'legacy',
      'selector-pseudo-class-no-unknown': [
        true,
        {
          ignorePseudoClasses: ['global', 'export'],
        },
      ],
      'media-feature-range-notation': 'prefix', // 只允许使用 min- 和 max-
      ...overrides,
    },
  };
}
