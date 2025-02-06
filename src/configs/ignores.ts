import { GLOB_EXCLUDE } from '../globs';

export function ignores(userIgnores: string[] = []) {
  return [
    {
      name: 'OB/ignores',
      ignores: [...GLOB_EXCLUDE, ...userIgnores],
    },
  ];
}
