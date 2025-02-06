import { stylelint } from './configs/stylelint';
import { StylelintOptions } from './types';

export function OBStylelintCfg(options?: StylelintOptions) {
  return stylelint(options);
}
