// 生成 VSCode 配置
export function generateVSCodeConfig(options) {
  const { eslint, oxlint, stylelint, prettier } = options;

  const settings = {
    'editor.formatOnSave': true,
    'editor.codeActionsOnSave': {},
  };

  if (eslint) {
    settings['eslint.enable'] = true;
    settings['eslint.validate'] = [
      'javascript',
      'javascriptreact',
      'typescript',
      'typescriptreact',
      'jsx',
    ];
    settings['eslint.useFlatConfig'] = true;
    settings['eslint.format.enable'] = true;
    settings['eslint.run'] = 'onSave';
    settings['eslint.debug'] = true;
    settings['editor.codeActionsOnSave']['source.fixAll.eslint'] = 'explicit';
  }

  if (oxlint) {
    settings['oxc.enable'] = true;
    settings['oxc.lint.run'] = 'onSave';
    settings['editor.codeActionsOnSave']['source.fixAll.oxc'] = 'always';

    if (!prettier) {
      settings['[javascript]'] = {
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      };
      settings['[typescript]'] = {
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      };
      settings['[javascriptreact]'] = {
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      };
      settings['[typescriptreact]'] = {
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      };
    }
  }

  if (stylelint) {
    settings['editor.codeActionsOnSave']['source.fixAll.stylelint'] =
      'explicit';
    settings['stylelint.validate'] = ['css', 'less', 'scss'];
  }

  if (prettier && !oxlint) {
    settings['editor.defaultFormatter'] = 'esbenp.prettier-vscode';
    settings['editor.formatOnSave'] = true;
    settings['prettier.enable'] = true;
  }

  return JSON.stringify(settings, null, 2);
}

// 生成 VSCode 配置（用于 oxfmt）
export function generateVSCodeConfigForOxfmt() {
  const settings = {
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'oxc.oxc-vscode',
    'oxc.enable': true,
    'oxc.fmt.experimental': true,
    'oxc.fmt.configPath': '.oxfmtrc.json',
    '[javascript]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
    '[typescript]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
    '[javascriptreact]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
    '[typescriptreact]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
    '[json]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
    '[jsonc]': {
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    },
  };

  return JSON.stringify(settings, null, 2);
}
