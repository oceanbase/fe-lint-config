# OceanBase Lint Standards

English | [中文](./README-zh-CN.md)

- [ESLint Configuration Instructions](#eslint)
- [Stylelint Configuration Instructions](#stylelint)

# Installation

```bash

npm i --save-dev @oceanbase/lint-config  eslint prettier stylelint stylelint-config-recommended-less stylelint-config-standard
```

# Requirements
- Requires ESLint v9.5.0+
- Requires Node.js (^18.18.0, ^20.9.0, or >=21.1.0)

# ESLint
## Enabled Plugins
- eslint-plugin-import
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-plugin-prettier

## Usage
Create an eslint.config.mjs file in the root directory of your project:

```js


// eslint.config.mjs
import { OBEslintCfg } from '@oceanbase/lint-config'

export default OBEslintCfg()
```

### Add Script to package.json
```json

{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Lint on Commit

Add the following to package.json to run linting and auto-fix on each commit:

```bash
npm i --save-dev lint-staged husky
```
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "./src/**/*.{js,jsx,ts,tsx}": [
      "npx prettier --write",
      "npm run lint:fix"
    ]
  }
}
```
## Customization

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg({
  // Default OBEslintCfg settings
  // The following modules are enabled by default and can be disabled by configuring `false`
  typescript: true,
  prettier: true,
  import: true,
  react: true,
  // `.eslintignore` does not work in flat config, you need to manually configure ignores
  // The following are the folders ignored by default
  ignores: [
    '**/fixtures'
    // ...globs
  ]
})
```
`OBEslintCfg` can also accept any number of custom configuration overrides:

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg(
  {
    // Default OBEslintCfg settings
  },
  {
    // Starting from the second parameter, use ESLint's Flat Configs to provide any custom configuration
    ignores: ['**/test'],
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^_' }]
    }
  },
  {
    rules: {}
  }
)
```

## Rule Overrides
Rules can be configured per module and can also be overridden with custom settings:

```js
// eslint.config.js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg(
  {
    // Typescript, react, prettier, import and other default modules all support overriding rules in this way
    typescript: {
      overrides: {
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  },
  {
    // You can also overwrite in subsequent configuration objects
    files: ['**/*.vue'],
    rules: {
      'vue/operator-linebreak': ['error', 'before']
    }
  }
)
```

## TypeScript Type Information Rules
You can enable TypeScript [type information rules]((https://typescript-eslint.io/linting/typed-linting/)) by setting the tsconfigPath parameter:
> [!NOTE]
> Type information rule checking is relatively strict, and you can decide whether to enable it based on your project situation
> In addition, enabling type information rules will have an impact on verification performance, depending on the size of the project repository

```js
import OBEslintCfg from '@oceanbase/lint-config'

export default OBEslintCfg({
  typescript: {
    tsconfigPath: 'tsconfig.json'
  }
})
```

## Adding New Rules

1. Add rules in src/rules.
2. Create a configuration file in src/configs and add the rule.
3. In src/factory.ts, define usage methods and expose configuration options.

## View Enabled Rules
Run the following command in the root directory:

```bash
npx @eslint/config-inspector
```

## IDE Support (Auto-Fix on Save)
<details>
<summary>🟦 VS Code Support</summary>

<br>

Install the VS Code ESLint [extension]((https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint))

Add the following to `.vscode/settings.json`:

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


# Stylelint
## Enabled Plugins
- [stylelint-config-recommended-less](https://github.com/stylelint-less/stylelint-less)
- [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard)

### Usage

Create a `.stylelintrc.mjs` file in your project root directory:

```js
// .stylelintrc.mjs
import { OBStylelintCfg } from '@oceanbase/lint-config'

export default OBStylelintCfg()
```

### Add Script to `package.json`
```json
{
  "scripts": {
    "lint:css": "stylelint '**/*.{less,css}'",
    "lint:fix:css": "stylelint '**/*.{less,css}' --fix"
  }
}
```

### Lint on Commit
Add the following to `package.json` to run stylelinting and auto-fix on each commit:

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "./src/**/*.{less,css}": [
      "npx stylelint --fix"
    ]
  }
}
```

## Rule Overrides
Stylelint allows adding custom plugins and rule overrides:

```js
// .stylelintrc.mjs
import { OBStylelintCfg } from '@oceanbase/lint-config'

export default OBStylelintCfg({
  extends: ['additional-plugin'],
  rules: {
    'selector-class-pattern': null
  }
})
```