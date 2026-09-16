import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const query = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};
const click = (selector: string) => query(selector).click();
const input = (selector: string, value: string) => {
  const element = query<HTMLInputElement>(selector);
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('climate-control-2050', () => {
  it('keeps slider focus and the animated globe during repeated input, then completes and restarts', async () => {
    await import('../../project-library/all-projects/工程源码/climate-control-2050/src/main');
    click('#enter-control');
    click('#begin-mission');
    const slider = query<HTMLInputElement>('[data-policy="renewable"]');
    const earth = query('.earth');
    slider.focus();
    for (const value of ['40', '50', '70']) {
      input('[data-policy="renewable"]', value);
      expect(query('[data-policy="renewable"]')).toBe(slider);
      expect(document.activeElement).toBe(slider);
      expect(query('.earth')).toBe(earth);
      expect(slider.closest('label')!.querySelector('strong')!.textContent).toContain(value);
    }
    click('#balanced-plan');
    click('#submit-plan');
    expect(query('.result').classList.contains('success')).toBe(true);
    click('#restart');
    expect(query<HTMLInputElement>('[data-policy="renewable"]').value).toBe('30');
    expect(document.querySelector('.result')).toBeNull();
  });

  it('updates forest output and budget lock without replacing controls', async () => {
    await import('../../project-library/all-projects/工程源码/climate-control-2050/src/main');
    click('#enter-control');
    click('#begin-mission');
    const slider = query<HTMLInputElement>('[data-policy="forest"]');
    input('[data-policy="forest"]', slider.max);
    input('[data-policy="renewable"]', query<HTMLInputElement>('[data-policy="renewable"]').max);
    input('[data-policy="transport"]', query<HTMLInputElement>('[data-policy="transport"]').max);
    input('[data-policy="coastal"]', query<HTMLInputElement>('[data-policy="coastal"]').max);
    expect(query('.forest-dots').childElementCount).toBe(Math.round(Number(slider.max) / 2));
    expect(query<HTMLButtonElement>('#submit-plan').disabled).toBe(true);
    expect(query('[data-policy="forest"]')).toBe(slider);
  });
});

describe('math-city-builder', () => {
  it('keeps a number input alive for empty and multi-digit typing, then builds all four tasks', async () => {
    await import('../../project-library/all-projects/工程源码/math-city-builder/src/main');
    click('#start-city');
    click('[data-task="market"]');
    const field = query<HTMLInputElement>('#salePrice');
    field.focus();
    for (const value of ['', '2', '20', '204']) {
      input('#salePrice', value);
      expect(query('#salePrice')).toBe(field);
      expect(document.activeElement).toBe(field);
      expect(field.value).toBe(value);
    }
    expect(query('.total b').textContent).toBe('¥204.00');
    click('#check-task');
    expect(query('.progress b').textContent).toBe('0/4');
    click('#finish-task');
    expect(query('.progress b').textContent).toBe('1/4');
    click('[data-task="park"]');
    const parkSlider = query('[data-value="parkWidth"]');
    const city = query('.city-map');
    input('[data-value="parkWidth"]', '6');
    input('[data-value="parkHeight"]', '5');
    expect(query('[data-value="parkWidth"]')).toBe(parkSlider);
    expect(query('.city-map')).toBe(city);
    expect(query('.live-math').textContent).toContain('30 m²');
    click('#check-task'); click('#finish-task');
    click('[data-task="road"]'); input('[data-value="mapLength"]', '12');
    expect(query('.equation strong').textContent).toBe('2.4 km');
    click('#check-task'); click('#finish-task');
    click('[data-task="school"]'); input('#extraSeats', '120');
    click('#check-task'); click('#finish-task');
    expect(document.querySelector('.certificate')).not.toBeNull();
    click('#restart');
    expect(query('.progress b').textContent).toBe('0/4');
  });

  it('invalidates a checked plan when the student edits it again', async () => {
    await import('../../project-library/all-projects/工程源码/math-city-builder/src/main');
    click('#start-city'); click('[data-task="market"]');
    input('#salePrice', '204'); click('#check-task');
    expect(document.querySelector('#finish-task')).not.toBeNull();
    input('#salePrice', '2');
    expect(document.querySelector('#finish-task')).toBeNull();
    expect(query<HTMLButtonElement>('#check-task').disabled).toBe(false);
    click('#check-task');
    expect(query('.task-sheet').classList.contains('wrong')).toBe(true);
    expect(query('.progress b').textContent).toBe('0/4');
  });
});

describe('wenyan-detective', () => {
  it('preserves the time slider and sun, completes the case and resets the experiment', async () => {
    const data = await import('../../project-library/all-projects/工程源码/wenyan-detective/src/data/case-file');
    await import('../../project-library/all-projects/工程源码/wenyan-detective/src/main');
    click('#enter-case');
    const slider = query('#time-slider');
    const sun = query('.lab-sun');
    slider.focus();
    for (const value of ['7', '12', '18']) {
      input('#time-slider', value);
      expect(query('#time-slider')).toBe(slider);
      expect(query('.lab-sun')).toBe(sun);
      expect(document.activeElement).toBe(slider);
    }
    expect(query('.time-readout strong').textContent).toBe('18:00');
    click('#record-experiment');
    for (const clue of data.clues) { click(`[data-clue="${clue.id}"]`); click('[data-close-clue]'); }
    for (const question of data.questions) click(`[data-question="${question.id}"][data-option="${question.answer}"]`);
    click(`[data-verdict="${data.verdicts.find((v) => v.correct)!.id}"]`);
    expect(query('.result-sheet').classList.contains('solved')).toBe(true);
    click('#result-action');
    expect(query<HTMLInputElement>('#time-slider').value).toBe('6');
    expect(query('.case-status b').textContent).toBe('0/5');
  });
});

describe('physics-accident-bureau', () => {
  it('keeps slider/car nodes, locks trial conditions, completes and restarts the investigation', async () => {
    vi.useFakeTimers();
    const data = await import('../../project-library/all-projects/工程源码/physics-accident-bureau/src/data/case-data');
    await import('../../project-library/all-projects/工程源码/physics-accident-bureau/src/main');
    click('#enter');
    const slider = query<HTMLInputElement>('#speed');
    const car = query('.sim-car');
    slider.focus();
    for (const value of ['60', '65', '72']) {
      input('#speed', value);
      expect(query('#speed')).toBe(slider);
      expect(query('.sim-car')).toBe(car);
      expect(document.activeElement).toBe(slider);
    }
    click('#preset');
    expect(query('#speed')).toBe(slider);
    click('#run-trial');
    expect(slider.disabled).toBe(true);
    expect(query('.sim-car')).toBe(car);
    expect(query('.simulator').classList.contains('running')).toBe(true);
    vi.advanceTimersByTime(1600);
    expect(slider.disabled).toBe(false);
    expect(query('.trial-log').textContent).toContain('72 km/h');
    input('#speed', '40'); click('#run-trial'); vi.advanceTimersByTime(1600);
    for (const item of data.evidence) { click(`[data-evidence="${item.id}"]`); click('[data-close]'); }
    for (const question of data.questions) click(`[data-question="${question.id}"][data-option="${question.answer}"]`);
    click(`[data-verdict="${data.verdicts.find((v) => v.correct)!.id}"]`);
    expect(query('.report').classList.contains('solved')).toBe(true);
    click('#report-action');
    expect(query('.trial-log').textContent).toContain('暂无记录');
    expect(query<HTMLInputElement>('#speed').value).toBe('50');
  });
});
