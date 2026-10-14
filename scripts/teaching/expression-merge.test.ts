import { beforeAll, describe, expect, it, vi } from 'vitest';
import { evaluate, expanded, formatExpression, mergeExpression, references, num, op } from '../../project-library/all-projects/工程源码/expression-merge/src/engine.js';
import { questions } from '../../project-library/all-projects/工程源码/expression-merge/src/questions.js';
import { expressionMarkup, mergePresentation } from '../../project-library/all-projects/工程源码/expression-merge/src/presentation.js';

describe('expression merge engine', () => {
  it('keeps all ten answers correct when merging forwards or from the final step', () => {
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      const answer = evaluate(q.steps.at(-1), q.steps);
      expect(evaluate(expanded(q.steps.at(-1), q.steps), q.steps)).toBe(answer);
      for (const order of ['forward', 'backward']) {
        let expressions = structuredClone(q.steps);
        const targets = order === 'forward' ? expressions.map((_, i) => i) : [expressions.length - 1];
        for (const target of targets) {
          let attempts = 0;
          while (references(expressions[target]).length) {
            expect(attempts++).toBeLessThan(20);
            const leaf = references(expressions[target])[0];
            const previous = JSON.stringify(expressions);
            const result = mergeExpression(expressions, leaf.step, target, leaf.path);
            expect(result.ok).toBe(true);
            expect(JSON.stringify(expressions)).toBe(previous);
            expressions = result.expressions;
            expect(evaluate(expressions[target], q.steps)).toBe(evaluate(q.steps[target], q.steps));
          }
        }
        expect(references(expressions.at(-1))).toHaveLength(0);
        expect(evaluate(expressions.at(-1), q.steps)).toBe(answer);
      }
    }
  });
  it('preserves subtraction and division grouping, including nested brackets', () => {
    expect(formatExpression(op('-', num(90), op('+', num(18), num(12))), [])).toBe('90 - (18 + 12)');
    expect(formatExpression(op('÷', num(96), op('÷', num(24), num(6))), [])).toBe('96 ÷ (24 ÷ 6)');
    const q = questions[0];
    expect(formatExpression(expanded(q.steps.at(-1), q.steps), q.steps)).toBe('360 ÷ [(42 - 30) × 6]');
  });
  it('rejects wrong source identity even when two results are both 30', () => {
    const q = questions[7];
    expect(evaluate(q.steps[0], q.steps)).toBe(30);
    expect(evaluate(q.steps[1], q.steps)).toBe(30);
    expect(mergeExpression(q.steps, 0, 2, 'R').ok).toBe(false);
    expect(mergeExpression(q.steps, 1, 2, 'R').ok).toBe(true);
    expect(mergeExpression(q.steps, 2, 0, 'L').ok).toBe(false);
    expect(mergeExpression(q.steps, 0, 2, '__proto__').ok).toBe(false);
  });
});

describe('classroom interaction', () => {
  const click = (selector: string) => (document.querySelector(selector) as HTMLButtonElement).click();
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    await import('../../project-library/all-projects/工程源码/expression-merge/src/main.js');
  });
  it('merges by selection, supports undo/reset, and provides completion feedback', () => {
    expect(document.querySelector('#steps')?.classList.contains('vertical-steps')).toBe(true);
    expect(document.querySelectorAll('.math[data-drag-source]')).toHaveLength(2);
    expect(document.querySelector('.final-step .math')?.hasAttribute('data-drag-source')).toBe(false);
    click('[data-source="0"]');
    click('[data-target="1"][data-path="L"]');
    expect(document.querySelectorAll('[data-target="1"]')).toHaveLength(0);
    click('[data-source="1"]');
    click('[data-target="2"]');
    expect((document.querySelector('#success') as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('#reason')?.textContent).toContain('360 ÷ [(42 - 30) × 6] = 5');
    click('[data-action="undo"]');
    expect((document.querySelector('#success') as HTMLElement).hidden).toBe(true);
    expect(document.querySelectorAll('[data-target="2"]')).toHaveLength(1);
    click('[data-action="reset"]');
    expect((document.querySelector('#undo') as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelectorAll('[data-target]')).toHaveLength(2);
  });
  it('navigates in place and hints at a valid target without revealing the answer', () => {
    const url = location.href;
    click('[data-action="next"]');
    expect(document.querySelector('#count')?.textContent).toBe('2 / 10');
    expect(location.href).toBe(url);
    expect((document.querySelector('#answer') as HTMLDetailsElement).open).toBe(false);
    click('[data-action="hint"]');
    expect(document.querySelectorAll('.matching')).toHaveLength(1);
    click('.matching');
    expect(document.querySelector('#message')?.textContent).toContain('可以继续合并');
  });
  it('unlocks controls and preserves one valid merge if an animation cannot run', async () => {
    const select = document.querySelector('#question') as HTMLSelectElement;
    select.value = '0'; select.dispatchEvent(new Event('change'));
    const animation = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    const scroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: () => { throw new Error('Animation interrupted'); } });
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: () => {} });
    try {
      click('[data-source="0"]'); click('[data-target="1"][data-path="L"]');
      expect(select.disabled).toBe(true);
      await vi.waitFor(() => expect(select.disabled).toBe(false));
      expect(document.querySelector('[aria-label="第2步表达式"]')?.textContent).toBe('(42 - 30) × 6 = 72');
      expect(document.querySelectorAll('.merge-flying,.merge-caption')).toHaveLength(0);
      click('[data-action="undo"]');
      expect(document.querySelectorAll('[data-target="1"]')).toHaveLength(1);
      expect((document.querySelector('#undo') as HTMLButtonElement).disabled).toBe(true);
    } finally {
      if (animation) Object.defineProperty(Element.prototype, 'animate', animation); else delete Element.prototype.animate;
      if (scroll) Object.defineProperty(Element.prototype, 'scrollIntoView', scroll); else delete Element.prototype.scrollIntoView;
    }
  });
});

describe('merge teaching presentation', () => {
  it('renders the same mathematics as the plain formatter for all exercises', () => {
    const element = document.createElement('div');
    for (const q of questions) for (const step of q.steps) {
      const full = expanded(step, q.steps);
      element.innerHTML = expressionMarkup(full, q.steps);
      expect(element.textContent).toBe(formatExpression(full, q.steps));
    }
  });
  it('distinguishes new round brackets, new square brackets, and existing inner brackets', () => {
    const q = questions[0];
    const first = mergeExpression(q.steps, 0, 1, 'L').expressions;
    const round = mergePresentation(q.steps[1], first[1], q.steps[0], q.steps, 'L');
    expect(round.newBrackets).toEqual(['L']);
    expect(round.explanation).toContain('小括号');
    const second = mergeExpression(first, 1, 2, 'R').expressions;
    const square = mergePresentation(first[2], second[2], first[1], q.steps, 'R');
    expect(square.newBrackets).toEqual(['R']);
    expect(square.explanation).toContain('中括号');
    const element = document.createElement('div');
    element.innerHTML = expressionMarkup(second[2], q.steps, null, square);
    expect([...element.querySelectorAll('.merge-bracket')].map(e => e.textContent)).toEqual(['[', ']']);
    expect(element.textContent).toBe('360 ÷ [(42 - 30) × 6]');
  });
  it('teaches the changed outer bracket when merging in reverse order', () => {
    const q = questions[0];
    const first = mergeExpression(q.steps, 1, 2, 'R').expressions;
    const second = mergeExpression(first, 0, 2, 'RL').expressions;
    const presentation = mergePresentation(first[2], second[2], first[0], q.steps, 'RL');
    expect(presentation.newBrackets.sort()).toEqual(['R', 'RL']);
    expect(presentation.explanation).toContain('外层改用中括号');
  });
  it('does not invent brackets when the normal operation order is sufficient', () => {
    const q = questions[1];
    const next = mergeExpression(q.steps, 0, 1, 'R').expressions;
    const presentation = mergePresentation(q.steps[1], next[1], q.steps[0], q.steps, 'R');
    expect(presentation.newBrackets).toEqual([]);
    expect(presentation.explanation).toContain('不需要添加括号');
  });
});
