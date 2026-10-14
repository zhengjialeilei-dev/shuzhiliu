export const num = (value) => ({ type: 'number', value });
export const ref = (step) => ({ type: 'reference', step });
export const op = (operator, left, right) => ({ type: 'operation', operator, left, right });

export function evaluate(node, steps) {
  if (node.type === 'number') return node.value;
  if (node.type === 'reference') return evaluate(steps[node.step], steps);
  const left = evaluate(node.left, steps), right = evaluate(node.right, steps);
  if (node.operator === '+') return left + right;
  if (node.operator === '-') return left - right;
  if (node.operator === '×') return left * right;
  if (right === 0) throw new Error('除数不能为 0');
  return left / right;
}

const precedence = (operator) => operator === '+' || operator === '-' ? 1 : 2;
export function needsBrackets(node, parent, side) {
  if (node.type !== 'operation' || !parent) return false;
  const child = precedence(node.operator), outer = precedence(parent);
  return child < outer || (side === 'right' && child === outer && (parent === '-' || parent === '÷'));
}

// Render the same tree for plain text and interactive output; never evaluate user code.
export function formatExpression(node, steps, referenceRenderer, path = '', parent = null, side = '') {
  if (node.type === 'number') return String(node.value);
  if (node.type === 'reference') return referenceRenderer ? referenceRenderer(node, path) : String(evaluate(node, steps));
  const left = formatExpression(node.left, steps, referenceRenderer, path + 'L', node.operator, 'left');
  const right = formatExpression(node.right, steps, referenceRenderer, path + 'R', node.operator, 'right');
  const expression = `${left} ${node.operator} ${right}`;
  if (!needsBrackets(node, parent, side)) return expression;
  const nested = expression.includes('(');
  return `${nested ? '[' : '('}${expression}${nested ? ']' : ')'}`;
}

export function references(node, path = '') {
  if (node.type === 'reference') return [{ step: node.step, path }];
  return node.type === 'operation' ? [...references(node.left, path + 'L'), ...references(node.right, path + 'R')] : [];
}

export function mergeExpression(expressions, source, target, path) {
  if (!Number.isInteger(source) || !Number.isInteger(target) || source < 0 || target >= expressions.length || source >= target || !/^[LR]+$/.test(path)) {
    return { ok: false, message: '请选择前面的分步算式，替换后面算式里的对应结果。' };
  }
  let leaf = expressions[target];
  for (const part of path) leaf = leaf?.[part === 'L' ? 'left' : 'right'];
  if (leaf?.type !== 'reference' || leaf.step !== source) return { ok: false, message: `这个位置来自第 ${leaf?.step + 1 || '?'} 步，请选择对应的算式。` };
  const next = structuredClone(expressions);
  let parent = next[target];
  for (const part of path.slice(0, -1)) parent = parent[part === 'L' ? 'left' : 'right'];
  parent[path.endsWith('L') ? 'left' : 'right'] = structuredClone(expressions[source]);
  return { ok: true, expressions: next, message: `已把第 ${source + 1} 步的算式放入第 ${target + 1} 步，运算结果不变。` };
}

export function expanded(node, steps) {
  if (node.type === 'reference') return expanded(steps[node.step], steps);
  return node.type === 'operation' ? op(node.operator, expanded(node.left, steps), expanded(node.right, steps)) : node;
}
