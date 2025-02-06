import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

import type {
  OptionsFiles,
  OptionsOverrides,
  OptionsTypeScriptWithTypes,
  TypedFlatConfigItem,
} from '../types';
import { GLOB_SRC } from '../globs';

export function react(
  options: OptionsOverrides & OptionsFiles & OptionsTypeScriptWithTypes = {},
): TypedFlatConfigItem[] {
  const { files = [GLOB_SRC], overrides = {} } = options;

  return [
    {
      name: 'OB/react/setup',
      plugins: {
        'react-hooks': reactHooks,
        react: reactPlugin,
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    {
      files,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
        sourceType: 'module',
      },
      name: 'OB/react/rules',
      rules: {
        // recommended rules from eslint-plugin-react
        'react/display-name': 0, // 确保所有 React 组件都有 displayName 属性。关闭
        'react/no-unsafe': 0, // 禁止使用不安全的生命周期方法，如 componentWillReceiveProps、componentWillUpdate 等。 关闭
        'react/prop-types': 0, // 强制对组件的 props 进行类型检查（使用 PropTypes）。关闭

        'react/jsx-uses-react': 1, // 防止 React 变量未使用时被错误地标记为未使用。
        'react/no-access-state-in-setstate': 1, // 禁止在 setState 方法中直接访问 state 属性，使用 prevState
        'react/no-array-index-key': 1, // 禁止在数组元素中使用数组索引作为 key 属性的值

        'react/jsx-key': 2, // 确保所有 JSX 元素都有唯一的 key 属性
        'react/jsx-no-comment-textnodes': 2, // 禁止在 JSX 中使用注释文本节点
        'react/jsx-no-duplicate-props': 2, // 禁止在 JSX 元素中传递重复的属性
        'react/jsx-no-target-blank': 2, // 防止使用 target="_blank" 时不设置 rel="noopener noreferrer" 属性，避免安全漏洞。
        'react/jsx-no-undef': 2, // 禁止在 JSX 元素中使用未定义的组件
        'react/jsx-uses-vars': 2, // 防止在 JSX 元素中使用未定义的变量
        'react/jsx-pascal-case': 2, // 确保所有 JSX 元素都符合 PascalCase 规范
        'react/no-children-prop': 2, // 防止通过 children 属性来传递子元素，应该直接在标签内部插入子元素。
        'react/no-danger-with-children': 2, //  防止在有 children 属性的情况下使用 dangerouslySetInnerHTML 属性。
        'react/no-deprecated': 2, // 禁止使用已废弃的 React API
        'react/no-direct-mutation-state': 2, // 禁止直接修改组件的 state 属性
        'react/no-find-dom-node': 2, // 禁止使用 findDOMNode 方法，因为该方法已被废弃，应该使用 ref 属性来获取 DOM 节点。
        'react/no-is-mounted': 2, // 禁止使用 isMounted 方法，因为该方法已被废弃，应该使用 state 属性来判断组件是否已挂载。
        'react/no-render-return-value': 2, // 禁止在 render 方法中返回 React.render 方法的返回值，因为该方法已被废弃，应该直接返回 JSX 元素。
        'react/no-string-refs': 2, // 禁止使用字符串类型的 ref 属性，应该使用 ref 属性来获取 DOM 节点。
        'react/no-unescaped-entities': 2, // 防止在 JSX 元素中使用未转义的实体字符
        'react/no-unknown-property': 2, // 防止在 JSX 元素中使用未知的属性
        'react/require-render-return': 2, // 确保在 render 方法中返回 JSX 元素
        'react/self-closing-comp': 2, // 确保自闭合的组件标签正确地使用了 /> 结束符。

        // recommended rules react-hooks
        'react-hooks/exhaustive-deps': 1,
        'react-hooks/rules-of-hooks': 1,

        // overrides
        ...overrides,
      },
    },
  ];
}
