export default {
  meta: {
    type: 'problem',
    docs: {
      description: '自动为数组中的元素添加缺失的"key"属性',
      category: '可能的错误',
      recommended: true,
    },
    fixable: 'code', // 标记规则为可自动修复
    schema: [], // 规则配置项，这里不需要额外配置
  },

  create(context) {
    // @see - https://zh-hans.eslint.org/docs/latest/extend/custom-rules
    return {
      JSXElement(node) {
        if (
          node.parent.type === 'ArrayExpression' &&
          !node.openingElement.attributes.some(
            (attr) => attr?.name?.name === 'key',
          )
        ) {
          const index = node.parent.elements.indexOf(node);

          const fix = (fixer) => {
            // console.log(node.openingElement)
            // 当标签内有属性 <div className='test' xx='xx'></div>
            if (
              node.openingElement &&
              node.openingElement.attributes &&
              node.openingElement.attributes.length > 0
            ) {
              return fixer.insertTextBefore(
                node.openingElement.attributes[0],
                `key="item_${index}" `,
              );
              // 自闭合标签 <Input />
            } else if (node.openingElement.selfClosing) {
              // />占两个数，所以要在这个之前添加就要-2
              return fixer.insertTextBeforeRange(
                [
                  node.openingElement.range[1] - 2,
                  node.openingElement.range[1] - 2,
                ],
                ` key="item_${index}" `,
              );
              // 非自闭合标签 且没有属性 <div></div>
            } else {
              return fixer.insertTextBeforeRange(
                [
                  node.openingElement.range[1] - 1,
                  node.openingElement.range[1] - 1,
                ],
                ` key="item_${index}" `,
              );
            }
          };
          context.report({
            node: node.openingElement,
            message: '数组中的元素缺少"key"属性.',
            fix,
          });
        }
        // 这个没有实际解决问题，获取到的是map的AST，而不是渲染后的AST，无法拿到对应的索引，渲染出来的key是一样的
        const callee = node?.parent?.parent?.parent?.parent?.callee;
        if (
          node?.parent?.type === 'ReturnStatement' &&
          callee?.type === 'MemberExpression' &&
          callee?.property?.name === 'map' &&
          !node.openingElement.attributes.some(
            (attr) => attr?.name?.name === 'key',
          )
        ) {
          const index = node.parent.parent.body.indexOf(node.parent);
          const fix = (fixer) => {
            // 当标签内有属性 <div className='test' xx='xx'></div>
            if (
              node.openingElement &&
              node.openingElement.attributes &&
              node.openingElement.attributes.length > 0
            ) {
              return fixer.insertTextBefore(
                node.openingElement.attributes[0],
                `key="item_${index}" `,
              );
              // 单标签 <Input />
            } else if (node.openingElement.selfClosing) {
              // />占两个数，所以要在这个之前添加就要-2
              return fixer.insertTextBeforeRange(
                [
                  node.openingElement.range[1] - 2,
                  node.openingElement.range[1] - 2,
                ],
                ` key="item_${index}" `,
              );
              // 双标签 且没有属性 <div></div>
            } else {
              return fixer.insertTextBeforeRange(
                [
                  node.openingElement.range[1] - 1,
                  node.openingElement.range[1] - 1,
                ],
                ` key="item_${index}" `,
              );
            }
          };
          context.report({
            node: node.openingElement,
            message: 'map中的元素缺少"key"属性.',
            fix,
          });
        }
      },
      JSXFragment(node) {
        if (node.parent.type === 'ArrayExpression') {
          const index = node.parent.elements.indexOf(node);

          context.report({
            node: node,
            message: '数组中的<>元素缺少"key"属性.',
            *fix(fixer) {
              yield fixer.insertTextAfterRange(
                [
                  node.openingFragment.range[0] + 1,
                  node.openingFragment.range[0] + 1,
                ],
                `div  key="item_${index}"`,
              );
              yield fixer.insertTextBeforeRange(
                [
                  node.closingFragment.range[1] - 1,
                  node.closingFragment.range[1] - 1,
                ],
                `div`,
              );
            },
          });
        }
      },
    };
  },
};
