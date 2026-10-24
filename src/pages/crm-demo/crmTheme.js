const THEME_KEY = 'gx-crm-theme';

let revealing = false;

export function readCrmTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* private mode */
  }
  return 'light';
}

export function writeCrmTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-crm-theme', theme);
  }
}

export function chartPalette(theme) {
  if (theme === 'dark') {
    return { grid: '#2e333c', tick: '#8b919c', bar: '#3a404a' };
  }
  return { grid: '#eceff3', tick: '#9aa0a6', bar: '#e6e8ee' };
}

function fallbackReveal(next, apply) {
  apply(next);
}

export function revealTheme(next, origin, apply) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || revealing || typeof document.startViewTransition !== 'function') {
    fallbackReveal(next, apply);
    return;
  }
  revealing = true;
  const x = origin.x;
  const y = origin.y;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  let transition;
  try {
    transition = document.startViewTransition(() => {
      apply(next);
    });
  } catch {
    revealing = false;
    fallbackReveal(next, apply);
    return;
  }
  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
      },
      {
        duration: 650,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }).catch(() => {});
  transition.finished.finally(() => {
    revealing = false;
  });
}
