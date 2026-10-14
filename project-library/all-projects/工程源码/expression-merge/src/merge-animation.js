export const canAnimateMerge = () => typeof Element.prototype.animate === 'function'
  && !matchMedia('(prefers-reduced-motion: reduce)').matches;

async function motion(element, frames, duration) {
  const animation = element.animate(frames, { duration, easing: 'ease-in-out', fill: 'forwards' });
  try { await animation.finished; } catch { /* A canceled visual must not strand the exercise. */ }
  finally { animation.cancel(); }
}

export async function playMerge({ slot, sourceText, origin, commit, getCard, presentation, onPhase }) {
  const flying = document.createElement('div');
  flying.className = 'merge-flying'; flying.textContent = sourceText;
  flying.setAttribute('aria-hidden', 'true');
  let card = slot.closest('article');
  const caption = document.createElement('p');
  caption.className = 'merge-caption'; caption.setAttribute('role', 'status');
  const phase = (name, message) => {
    card.dataset.mergePhase = name;
    caption.textContent = message; card.append(caption); onPhase(message);
    const bounds = card.getBoundingClientRect();
    if (bounds.top < 64 || bounds.bottom > innerHeight - 12) card.scrollIntoView({ block: 'center', behavior: 'instant' });
  };
  try {
    phase('travel', `① 找到对应结果，用 ${sourceText} 来替换它。`);
    slot.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    document.body.append(flying);
    const destination = slot.getBoundingClientRect();
    const width = flying.getBoundingClientRect().width;
    const clampX = (x) => Math.max(8, Math.min(innerWidth - width - 8, x));
    const fromX = clampX(origin.x), fromY = Math.max(72, Math.min(innerHeight - 100, origin.y));
    const toX = clampX(destination.x + destination.width / 2 - width / 2);
    const toY = Math.max(72, destination.y - 54);
    flying.style.left = `${toX}px`; flying.style.top = `${toY}px`;
    slot.classList.add('merge-target');
    await motion(flying, [{ transform: `translate(${fromX - toX}px,${fromY - toY}px)`, opacity: 0.8 }, { transform: 'translate(0,0)', opacity: 1 }], 650);
    await Promise.all([
      motion(slot, [{ opacity: 1 }, { opacity: 0.15, transform: 'scale(.8)' }], 300),
      motion(flying, [{ transform: 'translateY(0)', opacity: 1 },
        { transform: `translateY(${destination.y + destination.height / 2 - toY - flying.offsetHeight / 2}px)`, opacity: 0.85 }], 300),
    ]);
    commit(); card = getCard();
    phase('replace', '② 算式放进来了，接下来检查是否需要括号。');
    flying.remove();
    const inserted = card.querySelector('.merge-inserted');
    await motion(inserted, [{ backgroundColor: '#c9dfff' }, { backgroundColor: '#e4efff' }], 700);
    phase('brackets', `③ ${presentation.explanation}`);
    const brackets = [...card.querySelectorAll('.merge-bracket')];
    await Promise.all(brackets.map((bracket, i) => motion(bracket, [
      { opacity: 0, transform: `translateX(${i % 2 ? 12 : -12}px) scale(1.5)` },
      { opacity: 1, transform: 'translateX(0) scale(1)' },
    ], 600)));
    await motion(caption, [{ opacity: 1 }, { opacity: 1 }], 900);
  } finally {
    flying.remove(); caption.remove();
    slot.classList.remove('merge-target');
    delete card.dataset.mergePhase;
  }
}
