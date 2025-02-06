import type { OptionsOverrides, TypedFlatConfigItem } from '../types';

export function javascript(
  options: OptionsOverrides = {},
): TypedFlatConfigItem[] {
  const { overrides = {} } = options;

  return [
    {
      languageOptions: {
        ecmaVersion: 2022,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        sourceType: 'module',
      },
      linterOptions: {
        reportUnusedDisableDirectives: true,
      },
      name: 'OB/javascript/setup',
    },
    {
      name: 'OB/javascript/rules',
      rules: {
        'no-var': 2, // 禁止使用 var,
        eqeqeq: [2, 'smart'], // 强制使用严格等于(===)和不等于(!==)
        'no-unused-vars': [
          2,
          {
            args: 'none',
            caughtErrors: 'none',
            ignoreRestSiblings: true,
            vars: 'all',
          },
        ], // 禁止未使用过的变量
        'no-undef': 0, // 禁止使用未声明的变量

        'constructor-super': 1, // 构造函数中必须调用 super
        'default-case-last': 1, // switch 语句中的 default 子句在最后。
        'new-cap': [1, { capIsNew: false, newIsCap: true, properties: true }],
        'no-class-assign': 1, // 禁止对类进行赋值
        'no-cond-assign': [1, 'always'], // 禁止条件表达式中出现赋值操作符
        'no-const-assign': 1, // 禁止对 const 声明的变量进行赋值
        'no-dupe-args': 1, // 禁止重复的参数名称
        'no-dupe-class-members': 1, // 禁止类成员中出现重复的名称
        'no-dupe-keys': 1, // 禁止重复的键名
        'no-duplicate-case': 1, // 禁止重复的 case 分支
        'no-empty': [1, { allowEmptyCatch: true }], // 禁止出现空语句块
        'no-empty-pattern': 1, // 禁止出现空解构模式
        'no-eval': 1, // 禁止使用 eval
        'no-ex-assign': 1, // 禁止对 catch 子句的参数重新赋值
        'no-fallthrough': 1, // 禁止 case 语句落空
        'no-global-assign': 1, // 禁止对全局对象或只读的全局变量进行赋值
        'no-implied-eval': 1, // 禁止使用 setTimeout 和 setInterval 时传递字符串参数（类似于 eval）。
        'no-import-assign': 1, // 禁止对导入的绑定赋值。
        'no-redeclare': [1, { builtinGlobals: false }], // 禁止重复声明变量
        'no-self-assign': [1, { props: true }], // 禁止自我赋值
        'no-self-compare': 1, // 禁止自我比较
        'no-shadow-restricted-names': 1, // 禁止使用保留字作为变量名
        'no-this-before-super': 1, // 禁止在构造函数中调用 super() 之前使用 this 或 super
        'no-throw-literal': 1, // 禁止抛出异常字面量
        'no-unneeded-ternary': [1, { defaultAssignment: false }], // 禁止不必要的三元表达式
        'no-unreachable': 1, // 禁止在 return 语句后出现不必要代码
        'no-unreachable-loop': 1, // 禁止在循环语句中出现无法访问的代码
        'no-use-before-define': [
          1,
          { classes: false, functions: false, variables: true },
        ], // 禁止在变量定义之前使用它们
        'no-useless-constructor': 1, // 禁止不必要的构造函数。
        'prefer-rest-params': 1, // 使用 rest 参数而不是 arguments
        'prefer-spread': 1, // 使用扩展运算符而不是 apply

        ...overrides,
      },
    },
  ];
}
