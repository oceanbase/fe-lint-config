import type { Linter } from 'eslint';
import { Options as PrettierOptions } from 'prettier';
import stylelint from 'stylelint';

type ConfigExtends = string[];
type ConfigRules = Record<string, stylelint.ConfigRuleSettings<any, object>>;

export interface StylelintOptions {
  plugins: string[];
  extends: ConfigExtends;
  overrides: ConfigRules;
  ignores?: string[];
}
export type Awaitable<T> = T | Promise<T>;

export type TypedFlatConfigItem = Omit<
  Linter.Config<Linter.RulesRecord>,
  'plugins'
> & {
  // Relax plugins type limitation, as most of the plugins did not have correct type info yet.
  /**
   * An object containing a name-value mapping of plugin names to plugin objects. When `files` is specified, these plugins are only available to the matching files.
   *
   * @see [Using plugins in your configuration](https://eslint.org/docs/latest/user-guide/configuring/configuration-files-new#using-plugins-in-your-configuration)
   */
  plugins?: Record<string, any>;
};

export interface OptionsFiles {
  /**
   * Override the `files` option to provide custom globs.
   */
  files?: string[];
}
export interface OptionsComponentExts {
  /**
   * Additional extensions for components.
   *
   * @example ['vue']
   * @default []
   */
  componentExts?: string[];
}
export interface OptionsTypeScriptWithTypes {
  /**
   * When this options is provided, type aware rules will be enabled.
   * @see https://typescript-eslint.io/linting/typed-linting/
   */
  tsconfigPath?: string;
}

export interface OptionsOverrides {
  overrides?: TypedFlatConfigItem['rules'];
}
export type OptionsTypescript = OptionsTypeScriptWithTypes & OptionsOverrides;
export interface OptionsConfig extends OptionsComponentExts {
  /**
   * Core rules. Can't be disabled.
   */
  javascript?: OptionsOverrides;

  /**
   * Enable TypeScript support.
   *
   * Passing an object to enable TypeScript Language Server support.
   *
   */
  typescript?: boolean | OptionsTypescript;

  /**
   * Enable react rules.
   *
   * Requires installing:
   * - `@eslint-react/eslint-plugin`
   * - `eslint-plugin-react-hooks`
   * - `eslint-plugin-react-refresh`
   *
   * @default true
   */
  react?: boolean | OptionsOverrides;

  /**
   * Enable import rules.
   *
   * Requires installing:
   * - `eslint-plugin-import`
   *
   * @default true
   */
  imports?: boolean | OptionsOverrides;

  /*
   * Use external prettier to format files.
   *
   * Requires installing:
   * - `eslint-plugin-prettier`
   *
   * When set to `true`, it will enable all prettier.
   *
   * @default true
   */
  prettier?: boolean | PrettierOptions;
}
