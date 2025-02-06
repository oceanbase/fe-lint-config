import { StylelintOptions } from '@/types';

export function stylelint(options?: StylelintOptions) {
  const { overrides = {}, extends: customExtends = [] } = options || {};
  return {
    extends: [
      'stylelint-config-standard',
      'stylelint-config-recommended-less',
      ...customExtends,
    ],
    rules: {
      'selector-class-pattern': null,
      'keyframes-name-pattern': null,
      'no-descending-specificity': null,
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
