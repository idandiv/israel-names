// The guides: buttons on the hub (/guides) that show only the guides of one badge, and a reading progress bar on an article.
// Without JavaScript the buttons and the bar stay hidden and every guide shows.
const bar = document.querySelector('.gfilt');
const list = document.querySelector('.gcards');
if (bar && list) {
  const items = [...list.children];
  const buttons = [...bar.querySelectorAll('button')];
  bar.hidden = false;
  bar.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const t = b.dataset.t;
    for (const x of buttons) x.setAttribute('aria-pressed', String(x === b));
    for (const li of items) li.hidden = Boolean(t) && li.dataset.t !== t;
    list.classList.toggle('is-filtered', Boolean(t));
  });
}

const prog = document.querySelector('.gprog');
if (prog && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const fill = prog.firstElementChild;
  let waiting = false;
  const draw = () => {
    waiting = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  const ask = () => { if (!waiting) { waiting = true; requestAnimationFrame(draw); } };
  prog.hidden = false;
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask, { passive: true });
  draw();
}
