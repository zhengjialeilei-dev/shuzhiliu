import './style.css';
import { evaluate, formatExpression, references, mergeExpression, expanded } from './engine.js';
import { questions } from './questions.js';
import { expressionMarkup, mergePresentation } from './presentation.js';
import { canAnimateMerge, playMerge } from './merge-animation.js';

const root = document.querySelector('#app');
let index = 0, selected = null, history = [], expressions, moves = 0;
let drag = null, ghost = null, dragFrame = null, suppressClickUntil = 0;
let busy = false, mergeHighlight = null;
const finished = new Set();
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

root.innerHTML = `
  <main class="workbook">
    <header class="header"><div><p class="eyebrow">数与代数 / 运算顺序</p><h1>算式合并练习</h1></div><button class="plain" data-action="reset">↻ 重新练习</button></header>
    <nav class="lesson-nav" aria-label="选择练习"><button class="plain" data-action="previous" aria-label="上一题">←</button><label for="question">选择练习</label><select id="question" aria-label="选择练习">${questions.map((q, i) => `<option value="${i}">${i + 1}. ${q.title}</option>`).join('')}</select><span id="count"></span><button class="plain" data-action="next" aria-label="下一题">→</button></nav>
    <section class="intro"><div><span class="eyebrow" id="focus"></span><h2 id="lesson-title"></h2><p>把前一步的<strong>算式</strong>，放进后一步对应的<strong>结果</strong>里。</p></div><span class="lesson-number" id="number" aria-hidden="true"></span></section>
    <div class="instruction"><span class="instruction-dot"></span><p id="drag-help">把算式拖到对应的数字框，松手后观察“替换 → 加括号”。也可点选后再点数字框。</p></div>
    <section id="steps" class="steps vertical-steps" aria-label="分步算式与合并区域"></section>
    <section class="feedback" aria-label="操作反馈"><div><p class="feedback-label" id="feedback-label">现在试一试</p><p id="message" role="status" aria-live="polite"></p></div><div class="tools"><button class="plain" data-action="undo" id="undo">撤销一步</button><button class="plain" data-action="hint">给我提示</button></div></section>
    <section id="success" class="success" hidden><span class="success-mark" aria-hidden="true">✓</span><div><h2>合并完成，结果没变！</h2><p id="reason"></p></div><button class="primary" data-action="next" id="next-success">下一题 →</button></section>
    <details class="answer" id="answer"><summary>查看讲解与参考算式</summary><p class="answer-expression" id="answer-expression"></p><p id="explanation"></p><p class="fine">本练习根据运算顺序自动添加必要的括号；等价的综合算式可能有不同写法。</p></details>
    <footer><span id="progress">本次已完成 0 / ${questions.length} 题</span><span>提示：虚线框是可以被算式替换的位置</span></footer>
  </main>`;

function question() { return questions[index]; }
function complete() { return references(expressions.at(-1)).length === 0; }
function setMessage(text, tone = '') {
  document.querySelector('#message').textContent = text;
  document.querySelector('.feedback').dataset.tone = tone;
  document.querySelector('#feedback-label').textContent = tone === 'error' ? '再想一想' : tone === 'success' ? '替换成功' : '现在试一试';
}

function expressionHtml(node, target) {
  return expressionMarkup(node, question().steps, (leaf, path) => {
    const value = evaluate(leaf, question().steps);
    return `<button class="slot${selected === leaf.step ? ' matching' : ''}" data-target="${target}" data-path="${path}" data-ref="${leaf.step}" aria-label="第${target + 1}步的${value}，来自第${leaf.step + 1}步">${value}</button>`;
  }, mergeHighlight?.target === target ? mergeHighlight : null);
}

function render() {
  const q = question(), last = expressions.length - 1;
  document.querySelector('#steps').innerHTML = expressions.map((expr, i) => `
    <article class="step${i === last ? ' final-step' : ''}${selected === i ? ' selected' : ''}" aria-label="第${i + 1}步算式">
      <div class="step-top"><span class="step-label">第 ${i + 1} 步</span>${i < last ? `<button class="use" data-source="${i}" aria-label="使用第${i + 1}步算式" aria-describedby="drag-help" aria-pressed="${selected === i}">${selected === i ? '已选中' : '拖动 / 点选'} <span aria-hidden="true">↓</span></button>` : `<span class="step-label destination-label">合并到这里</span>`}</div>
      <div class="math" ${i < last ? `data-drag-source="${i}" title="按住算式拖到下方对应的数字框"` : ''} aria-label="第${i + 1}步表达式">${expressionHtml(expr, i)}<span class="equals"> = ${evaluate(expr, q.steps)}</span></div>
      <p class="step-note">${i === last ? (complete() ? '已经包含全部分步运算' : '把虚线框里的结果替换成前面的算式') : `结果 ${evaluate(expr, q.steps)}，可以替换后面对应的数`}</p>
    </article>`).join('');
  document.querySelector('#undo').disabled = history.length === 0;
  const done = complete();
  document.querySelector('#success').hidden = !done;
  if (done) finished.add(index);
  document.querySelector('#reason').textContent = `${formatExpression(expressions.at(-1), q.steps)} = ${evaluate(expressions.at(-1), q.steps)}。${q.explanation}`;
  document.querySelector('#next-success').textContent = index === questions.length - 1 ? '回到第一题 →' : '下一题 →';
  document.querySelector('#progress').textContent = `本次已完成 ${finished.size} / ${questions.length} 题 · 本题已替换 ${moves} 次`;
}

function loadQuestion(nextIndex) {
  cancelDrag();
  index = (nextIndex + questions.length) % questions.length;
  selected = null; history = []; moves = 0;
  expressions = structuredClone(question().steps);
  document.querySelector('#question').value = String(index);
  document.querySelector('#count').textContent = `${index + 1} / ${questions.length}`;
  document.querySelector('#number').textContent = String(index + 1).padStart(2, '0');
  document.querySelector('#focus').textContent = question().focus;
  document.querySelector('#lesson-title').textContent = question().title;
  document.querySelector('#answer').open = false;
  document.querySelector('#answer-expression').textContent = `${formatExpression(expanded(question().steps.at(-1), question().steps), question().steps)} = ${evaluate(question().steps.at(-1), question().steps)}`;
  document.querySelector('#explanation').textContent = question().explanation;
  render();
  setMessage('按住上面的算式，拖到下面来自这一步的数字框里。');
}

function choose(source) {
  selected = selected === source ? null : source;
  render();
  setMessage(selected === null ? '已取消选择，可以重新选一个算式。' : `已选第 ${source + 1} 步：${formatExpression(expressions[source], question().steps)}。请点击后面来自这一步的 ${evaluate(expressions[source], question().steps)}。`);
  root.querySelector(`[data-source="${source}"]`)?.focus({ preventScroll: true });
}

function setBusy(value) {
  busy = value;
  root.setAttribute('aria-busy', String(value));
  root.querySelectorAll('button,select').forEach((element) => { element.disabled = value; });
  if (!value) document.querySelector('#undo').disabled = history.length === 0;
}

function merge(source, target, path, dragOrigin) {
  if (busy) return;
  const result = mergeExpression(expressions, source, target, path);
  if (!result.ok) { setMessage(result.message, 'error'); return; }
  const presentation = mergePresentation(expressions[target], result.expressions[target], expressions[source], question().steps, path);
  const sourceText = formatExpression(expressions[source], question().steps);
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    history.push({ expressions: structuredClone(expressions), moves });
    expressions = result.expressions; moves++; selected = null;
    mergeHighlight = { ...presentation, target };
    render();
    if (busy) { setBusy(true); document.querySelector('#success').hidden = true; }
  };
  const finish = () => {
    commit(); mergeHighlight = null; render(); setBusy(false);
    setMessage(`${presentation.explanation} ${complete() ? '合并完成，结果没变！' : '可以继续合并。'}`, 'success');
  };
  if (!canAnimateMerge()) { finish(); return; }
  const slot = root.querySelector(`[data-target="${target}"][data-path="${path}"]`);
  const origin = dragOrigin || root.querySelector(`[data-drag-source="${source}"]`).getBoundingClientRect();
  setBusy(true);
  playMerge({ slot, sourceText, origin, commit, presentation,
    getCard: () => root.querySelector(`article:nth-child(${target + 1})`), onPhase: setMessage,
  }).catch(() => { /* Preserve the valid merge if the browser interrupts an effect. */ }).finally(finish);
}

root.addEventListener('click', (event) => {
  if (busy) return;
  if (event.detail > 0 && performance.now() < suppressClickUntil) return;
  const source = event.target.closest('[data-source]');
  if (source) return choose(Number(source.dataset.source));
  const target = event.target.closest('[data-target]');
  if (target) {
    if (selected === null) return setMessage('把上面的对应算式拖到这里，或先点击“拖动 / 点选”再点这里。');
    return merge(selected, Number(target.dataset.target), target.dataset.path);
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'reset') loadQuestion(index);
  if (action === 'next') loadQuestion(index + 1);
  if (action === 'previous') loadQuestion(index - 1);
  if (action === 'undo' && history.length) {
    ({ expressions, moves } = history.pop()); selected = null; render(); setMessage('已撤销上一步，可以换一种顺序继续合并。');
  }
  if (action === 'hint') {
    const target = expressions.length - 1, next = references(expressions[target])[0];
    if (!next) return setMessage(question().explanation, 'success');
    selected = next.step; render();
    setMessage(`看第 ${target + 1} 步中的 ${evaluate({ type: 'reference', step: next.step }, question().steps)}，它来自第 ${next.step + 1} 步。用选中的算式替换它。`);
  }
});

document.querySelector('#question').addEventListener('change', (event) => { if (!busy) loadQuestion(Number(event.target.value)); });
root.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !busy) { cancelDrag(); selected = null; render(); setMessage('已取消选择。'); }
});

function cancelDrag() {
  if (dragFrame !== null) cancelAnimationFrame(dragFrame);
  dragFrame = null;
  ghost?.remove(); ghost = null; drag = null;
  root.querySelectorAll('.drop-over,.drag-match,.dragging').forEach((element) => element.classList.remove('drop-over', 'drag-match', 'dragging'));
}

function dropTarget() {
  return drag && document.elementFromPoint(drag.currentX, drag.currentY)?.closest('[data-target]');
}

function dragTick() {
  if (!drag?.active) return;
  const edge = 64;
  const direction = drag.currentY > innerHeight - edge ? 1 : drag.currentY < edge ? -1 : 0;
  if (direction) window.scrollBy(0, direction * 9);
  root.querySelectorAll('.drop-over').forEach((element) => element.classList.remove('drop-over'));
  const target = dropTarget();
  if (target && Number(target.dataset.ref) === drag.source) target.classList.add('drop-over');
  dragFrame = requestAnimationFrame(dragTick);
}

root.addEventListener('pointerdown', (event) => {
  if (busy) return;
  // A fresh gesture is never the synthetic click following the previous drag.
  suppressClickUntil = 0;
  const handle = event.target.closest('[data-source],[data-drag-source]');
  if (!handle || event.button !== 0 || drag) return;
  drag = { source: Number(handle.dataset.source ?? handle.dataset.dragSource), x: event.clientX, y: event.clientY, currentX: event.clientX, currentY: event.clientY, pointer: event.pointerId, active: false };
  // Capture the pressed element so a short tap on a nested slot still clicks it.
  event.target.setPointerCapture(event.pointerId);
});
root.addEventListener('pointermove', (event) => {
  if (!drag || drag.pointer !== event.pointerId) return;
  drag.currentX = event.clientX; drag.currentY = event.clientY;
  if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
  if (!drag.active) {
    drag.active = true;
    ghost = document.createElement('div'); ghost.className = 'drag-ghost';
    ghost.innerHTML = escape(formatExpression(expressions[drag.source], question().steps));
    ghost.setAttribute('aria-hidden', 'true');
    document.body.append(ghost);
    root.querySelector(`[data-drag-source="${drag.source}"]`)?.closest('article').classList.add('dragging');
    root.querySelectorAll(`[data-ref="${drag.source}"]`).forEach((element) => element.classList.add('drag-match'));
    dragFrame = requestAnimationFrame(dragTick);
  }
  const halfWidth = ghost.getBoundingClientRect().width / 2 + 8;
  ghost.style.left = `${Math.max(halfWidth, Math.min(innerWidth - halfWidth, event.clientX))}px`;
  ghost.style.top = `${Math.max(6, event.clientY - 64)}px`;
});
root.addEventListener('pointerup', (event) => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const { active, source } = drag;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-target]');
  const origin = ghost?.getBoundingClientRect();
  cancelDrag();
  if (!active) return;
  suppressClickUntil = performance.now() + 200;
  if (target) merge(source, Number(target.dataset.target), target.dataset.path, origin);
  else setMessage('把算式拖到虚线框里的对应结果上；也可以用点选方式完成。');
});
root.addEventListener('pointercancel', cancelDrag);
window.addEventListener('blur', cancelDrag);
loadQuestion(0);
