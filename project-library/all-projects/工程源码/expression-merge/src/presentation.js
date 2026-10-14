import { evaluate, needsBrackets } from './engine.js';

// Keep the teaching overlay separate from arithmetic and merge state.
function walk(node, steps, renderRef, highlights, path = '', parent = null, side = '', brackets = {}) {
  let text, html;
  if (node.type === 'number') text = html = String(node.value);
  else if (node.type === 'reference') {
    text = String(evaluate(node, steps));
    html = renderRef ? renderRef(node, path) : text;
  } else {
    const left = walk(node.left, steps, renderRef, highlights, path + 'L', node.operator, 'left', brackets);
    const right = walk(node.right, steps, renderRef, highlights, path + 'R', node.operator, 'right', brackets);
    text = `${left.text} ${node.operator} ${right.text}`;
    html = `${left.html} ${node.operator} ${right.html}`;
    if (needsBrackets(node, parent, side)) {
      const pair = text.includes('(') ? ['[', ']'] : ['(', ')'];
      brackets[path] = pair.join('');
      const mark = highlights?.newBrackets.includes(path) ? ' class="merge-bracket"' : '';
      html = `<span${mark}>${pair[0]}</span>${html}<span${mark}>${pair[1]}</span>`;
      text = pair[0] + text + pair[1];
    }
  }
  if (highlights?.path === path) html = `<span class="merge-inserted">${html}</span>`;
  return { text, html, brackets };
}

export function expressionMarkup(node, steps, renderRef, highlights) {
  return walk(node, steps, renderRef, highlights).html;
}

export function mergePresentation(before, after, source, steps, path) {
  const previous = { ...walk(before, steps).brackets };
  // Inner parentheses arriving with the source already existed; only teach new ones.
  for (const [relative, pair] of Object.entries(walk(source, steps).brackets)) previous[path + relative] = pair;
  const next = walk(after, steps).brackets;
  const newBrackets = Object.keys(next).filter((key) => next[key] !== previous[key]);
  const square = newBrackets.some((key) => next[key] === '[]');
  const round = newBrackets.some((key) => next[key] === '()');
  const explanation = !newBrackets.length
    ? '按原有运算顺序计算即可，这次不需要添加括号。'
    : square && round
      ? '先加小括号，外层改用中括号；先算小括号里的，再算中括号里的。'
      : square
        ? '已有小括号，外面再加中括号，把整段算式作为一个整体。'
        : '加上小括号，保持原来先算这一步的顺序。';
  return { path, newBrackets, explanation };
}
