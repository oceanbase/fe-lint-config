# OceanBase lint 规范

- [Eslint 配置说明](#eslint)
- [Stylelint 配置说明](#stylelint)

# 安装

```bash
tnpm i --save-dev eslint prettier stylelint @oceanbase/lint-config

```
# 限制
- 要求 ESLint v9.5.0+
- 要求 Node.js (^18.18.0, ^20.9.0, or >=21.1.0) 

# eslint

## 已启动插件
- [eslint-plugin-import](https://github.com/benmosher/eslint-plugin-import)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [eslint-plugin-react-hooks](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)

## 使用
在项目根目录创建 `eslint.config.mjs` 文件

```js
// eslint.config.mjs
import { OBEslintCfg } from '@oceanbase/lint-config'

export default OBEslintCfg()
```

### 在 `package.json` 中添加脚本

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Lint 提交

在 `package.json` 中添加以下内容以在每次提交前执行 lint 和自动修复
```bash
tnpm i -save-dev lint-staged husky
```

```json
{
  "scripts": {
    "prepare": "husky install",
  },
 "lint-staged": {
    "./src/**/*.{js,jsx,ts,tsx}": [
      "npx prettier --write",
      "npm run lint:fix"
    ],
  },
}
```

## 自定义

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg({
  // 配置默认插件
  // 以下模块默认开启，可以通过配置 `false` 关闭
  typescript: true,
  prettier: true,
  import: true,
  react: true,

  // `.eslintignore` 在 flat config 不生效，需要手动配置 ignores
  // 以下为默认忽略的文件夹
  ignores: [
    '**/fixtures',
    // ...globs
  ]
})
```

`OBEslintCfg` 也可以接受任意数量的自定义配置覆盖参数：

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg(
  {
    // OBEslintCfg 配置
  },
  // 从第二个参数开始，使用 ESLint 的 Flat Configs 提供任意个自定义配置
  {
    ignores: ['**/test'],
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },
  {
    rules: {},
  },
)
```

## 规则覆盖
所有规则只在特定模块下配置，当然也支持在第一个参数之后的配置中覆盖默认配置

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg(
  {
    // typescript、react、prettier、import 等默认模块均支持这样覆盖规则
    typescript: {
      overrides: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    }
  },
  {
    // 也可以在后续配置对象内覆盖
    files: ['**/*.vue'],
    rules: {
      'vue/operator-linebreak': ['error', 'before'],
    },
  },
)
```

## 基于 TypeScript 的类型信息规则

你可以通过配置 tsconfigPath 参数来开启基于 TypeScript 的[类型信息规则](https://typescript-eslint.io/linting/typed-linting/)

> [!NOTE]
> 类型信息规则检查相对比较严格，可依据各自项目情况判断是否开启
> 此外，开启类型信息规则对校验性能会有影响，视项目仓库大小而定

```js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg({
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
})
```


## 添加新规则

1. 在 `src/rules` 下添加规则
2. 在 `src/configs` 下创建配置文件，并将规则加入配置
3. 在 `src/factory.ts` 中添加使用方式，暴露一些配置参数

## 查看已启用的规则

以下命令需要在项目根目录下执行
```bash
npx @eslint/config-inspector
```

## IDE Support (auto fix on save)
## IDE 支持 (保存时自动修复)

<details>
<summary>🟦 VS Code 支持</summary>

<br>

安装 VS Code ESLint [插件](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

在 `.vscode/settings.json` 中添加以下配置:
```jsonc
{
  // Disable the default formatter, use eslint instead
  "prettier.enable": false,
  "editor.formatOnSave": false,

  // Auto fix
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },

  // Enable eslint for all supported languages
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue",
    "html",
    "markdown",
    "json",
    "jsonc",
    "yaml",
    "toml",
    "xml",
    "gql",
    "graphql",
    "astro",
    "svelte",
    "css",
    "less",
    "scss",
    "pcss",
    "postcss"
  ]
}
```

</details>

# stylelint

## 已启用插件

- [stylelint-config-recommended-less](https://github.com/stylelint-less/stylelint-less)
- [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard)

## 使用

### 使用
在项目根目录创建 `.stylelintrc.mjs` 文件

```js
// .stylelintrc.mjs
import { OBStylelintCfg } from '@oceanbase/lint-config'

export default OBStylelintCfg()
```

### 在 `package.json` 中添加脚本

```json
{
  "scripts": {
    "lint:css": "stylelint '**/*.{less,css}'",
    "lint:fix:css": "stylelint '**/*.{less,css}' --fix"
  }
}
```

### Lint 提交

在 `package.json` 中添加以下内容以在每次提交前执行 lint 和自动修复

```json
{
  "scripts": {
    "prepare": "husky install",
  },
 "lint-staged": {
    "./src/**/*.{less,css}": [
      "npx stylelint --fix"
    ]
  },
}
```

## 规则覆盖

stylelint 支持添加任意个自定义插件 extends 以及 rules 覆盖

```js
// .stylelintrc.mjs
import { OBStylelintCfg } from '@oceanbase/lint-config'

export default OBStylelintCfg({
  extends: ['xxx插件'],
  rules: {
    'selector-class-pattern': null,
  }
})
```
