export const GLOB_EXCLUDE = [
  // 'node_modules/*',
  // 'dist/*',
  // 'mock/*',
  // 'mockData/*',
  // 'public/*',
  // 'src/.umi/*',
  // 'src/.umi-production/*',
  // 'src/.umi-test/*',
  // 'src/services/*',
  // 'src/i18n/*',
  '**/node_modules',
  '**/dist',
  '**/mock',
  '**/mockData',
  '**/public',
  '**/.umi',
  '**/.umi-production',
  '**/.umi-test',
  '**/services',
  '**/src/i18n',

  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',

  '**/temp',
  '**/.temp',
  '**/tmp',
  '**/.tmp',

  '**/CHANGELOG*.md',
  '**/*.min.*',
  '**/LICENSE*',
];

export const GLOB_SRC_EXT = '?([cm])[jt]s?(x)';
/* 
  1. .js
  2. .jsx
  3. .ts
  4. .tsx
  5. .cjs
  6. .mjs
  7. .cts
  8. .mts
*/
export const GLOB_SRC = '**/*.?([cm])[jt]s?(x)';

export const GLOB_JS = '**/*.?([cm])js';
export const GLOB_JSX = '**/*.?([cm])jsx';

export const GLOB_TS = '**/*.?([cm])ts';
export const GLOB_TSX = '**/*.?([cm])tsx';

export const GLOB_STYLE = '**/*.{c,le,sc}ss';
export const GLOB_CSS = '**/*.css';
export const GLOB_POSTCSS = '**/*.{p,post}css';
export const GLOB_LESS = '**/*.less';
export const GLOB_SCSS = '**/*.scss';

export const GLOB_JSON = '**/*.json';
export const GLOB_JSON5 = '**/*.json5';
export const GLOB_JSONC = '**/*.jsonc';

export const GLOB_YAML = '**/*.y?(a)ml';
export const GLOB_TOML = '**/*.toml';
export const GLOB_XML = '**/*.xml';
export const GLOB_SVG = '**/*.svg';
export const GLOB_HTML = '**/*.htm?(l)';

export const GLOB_ALL_SRC = [
  GLOB_SRC,
  GLOB_STYLE,
  GLOB_JSON,
  GLOB_JSON5,
  GLOB_YAML,
  GLOB_XML,
  GLOB_HTML,
];
