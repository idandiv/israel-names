// The guides hub (/guides): buttons that show only the guides of one badge. Without JavaScript the buttons stay hidden and every guide shows.
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
