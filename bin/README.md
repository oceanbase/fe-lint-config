# Lint 配置工具

提供交互式命令行工具，帮助您管理 ESLint、Oxlint 和 Stylelint 配置。

## 使用方法

### 方式一：使用 npx（推荐，需要包已发布）

```bash
npx @oceanbase/lint-config setup
```

或者使用完整包名：

```bash
npx @oceanbase/lint-config@latest setup
```

### 方式二：本地开发测试

如果是在本地开发或测试，可以使用以下方式：

**方法 1：使用 npm link（推荐）**

```bash
# 在 fe-lint-config 项目根目录
npm link

# 在其他项目目录
npx @oceanbase/lint-config setup
```

**方法 2：直接运行脚本**

```bash
# 在 fe-lint-config 项目根目录
npm run setup

# 或者直接运行
node bin/setup-lint.js
```

**方法 3：全局安装**

```bash
npm install -g @oceanbase/lint-config
setup
```

## setup - Lint 配置向导

交互式命令行工具，帮助您快速设置 ESLint、Oxlint 或 Stylelint 配置。

### 功能选项

运行 `setup` 后，您可以选择以下选项：

1. **Oxlint (极速性能)** - 使用 Oxlint 进行代码检查
2. **Oxfmt (格式化工具迁移，平替 Prettier)** - 将 Prettier 配置迁移到 Oxfmt
3. **@oceanbase/lint-config(Eslint v9 & Stylelint v16)** - 使用 @oceanbase/lint-config 配置 ESLint 和 Stylelint
4. **ESLint 版本升级 (将旧版 ESLint 配置迁移到 v9 flat config)** - 将旧版 ESLint 配置迁移到 v9 flat config 格式
5. **eslint-plugin-oxlint (同时使用 ESLint v9 & Oxlint， 自动关闭 Eslint 中 Oxlint 配置规则)** - 同时使用 ESLint 和 Oxlint，自动关闭重复规则

### 功能特性

- ✅ **Node 版本检测**：自动检测 Node.js 版本，低于 21 时提示安装 LTS 版本
- ✅ **配置迁移**：自动检测并迁移旧的 ESLint/Stylelint 配置文件
- ✅ **规则保留**：迁移时保留现有规则
- ✅ **交互式引导**：一步步配置，清晰明了
- ✅ **自动检测项目类型**：自动检测 TypeScript、React 项目
- ✅ **多工具支持**：支持 ESLint、Oxlint、Stylelint 或组合使用
- ✅ **自动生成配置文件**：生成符合规范的配置文件
- ✅ **自动安装依赖**：自动安装所需的依赖包
- ✅ **自动添加 npm scripts**：自动添加 lint 相关脚本
- ✅ **VSCode 集成**：自动生成 VSCode 配置文件

### 配置流程

#### 选项 1: Oxlint

1. **Node 版本检查**
2. **选择 Linter**: Oxlint
3. **检测项目类型**: 自动检测 TypeScript、React
4. **生成配置文件**: `.oxlintrc.json`
5. **安装依赖**: `oxlint`
6. **添加 npm scripts**: `lint:oxlint`, `lint:oxlint:fix`
7. **配置 lint-staged** (可选)
8. **VSCode 配置** (可选)

#### 选项 2: Oxfmt (Prettier 迁移)

1. **检测 Prettier 配置**
2. **确认迁移**
3. **生成配置文件**: `.oxfmtrc.json`
4. **迁移 `.prettierignore`**: 转换为 `ignorePatterns`
5. **更新 package.json 脚本**: `format`, `format:check`
6. **配置 lint-staged** (可选)
7. **VSCode 配置** (可选)
8. **卸载 Prettier 依赖** (可选)

#### 选项 3: @oceanbase/lint-config

1. **Node 版本检查**
2. **选择 Linter**: @oceanbase/lint-config
3. **检测项目类型**: 自动检测 TypeScript、React
4. **配置选项**: Prettier、Import 规则（默认开启）
5. **生成配置文件**: `eslint.config.mjs`
6. **Stylelint 配置** (可选): `.stylelintrc.mjs`
7. **安装依赖**: `@oceanbase/lint-config`, `eslint`, `prettier` 等
8. **添加 npm scripts**: `lint`, `lint:fix`, `lint:css` 等
9. **VSCode 配置** (可选)

#### 选项 4: ESLint 版本升级

此选项会将旧版 ESLint 配置迁移到 v9 flat config 格式。

**迁移流程：**

1. **检测旧配置**: 自动检测 `.eslintrc.*` 配置文件
2. **备份旧配置** (可选): 自动备份旧配置文件
3. **使用官方工具迁移**: 使用 `@eslint/migrate-config` 进行迁移
4. **生成新配置**: 生成 `eslint.config.mjs` 文件
5. **安装依赖**: 自动检测并安装迁移后需要的依赖包
6. **清理旧配置** (可选): 删除旧的配置文件

**注意事项：**

- 对于 `.eslintrc.js`、`.eslintrc.cjs`、`.eslintrc.mjs` 文件：
  - 工具只能迁移评估后的配置（执行后的结果）
  - 文件中的逻辑（函数、计算路径等）会丢失
  - 如果配置主要是静态的，结果会很好
  - 如果配置较复杂，建议手动迁移或检查生成的配置

- 如果迁移工具遇到 `CallExpression` 或 `SpreadElement` 错误：
  - 需要手动简化配置文件
  - 移除 `require.resolve()` 调用，直接使用字符串
  - 移除扩展运算符，展开为具体值

#### 选项 5: eslint-plugin-oxlint

1. **安装 eslint-plugin-oxlint**
2. **修改 ESLint 配置文件**:
   - 检测配置类型（OBEslintCfg、Flat Config、Legacy Config）
   - 自动添加 oxlint 配置
   - 如果检测到 Legacy Config，推荐迁移到 Flat Config
3. **更新 package.json 脚本**: `lint: npx oxlint && npx eslint`

### 使用示例

```bash
$ npx @oceanbase/lint-config setup

🚀 欢迎使用 Lint 配置向导
==================================================

请选择要使用的代码检查工具:
  1. Oxlint (极速性能)
  2. Oxfmt (格式化工具迁移，平替 Prettier)
  3. @oceanbase/lint-config(Eslint v9 & Stylelint v16)
  4. ESLint 版本升级 (将旧版 ESLint 配置迁移到 v9 flat config)
  5. eslint-plugin-oxlint (同时使用 ESLint v9 & Oxlint， 自动关闭 Eslint 中 Oxlint 配置规则)

请选择 (输入数字): 1

✓ 检测到 TypeScript 配置，已默认开启 TypeScript 支持
✓ 检测到 React 依赖，已默认开启 React 支持

📝 正在生成配置文件...
✓ Oxlint 配置文件已生成

是否现在安装依赖? (y/n): y
正在安装依赖: oxlint
✓ 依赖安装成功

是否在 package.json 中添加 lint 脚本? (y/n): y
✓ package.json 脚本已添加

✨ 配置完成!
```

## 注意事项

- 确保在项目根目录运行命令
- 如果配置文件已存在，会询问是否覆盖
- 支持 npm、yarn、pnpm 包管理器（自动检测）
- 推荐使用 Node.js 21+ (LTS 版本)

## 文档链接

- 项目仓库: https://github.com/oceanbase/fe-lint-config
- ESLint 迁移指南: https://eslint.org/docs/latest/use/configure/migration-guide
- Oxlint 文档: https://oxc.rs/
- Oxfmt 文档: https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
