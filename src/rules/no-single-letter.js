export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow single letter variable names',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [], // no options
  },
  create: function (context) {
    return {
      Identifier(node) {
        if (node.name.length === 1) {
          context.report({
            node,
            message: 'Single letter variable names are not allowed.',
          });
        }
      },
    };
  },
};
