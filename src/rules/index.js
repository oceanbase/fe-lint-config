import fixMissingKey from './fix-missing-key';
import noSingleLetter from './no-single-letter';
export const customPlugin = {
  rules: {
    'fix-missing-key': fixMissingKey,
    'no-single-letter': noSingleLetter,
  },
};
