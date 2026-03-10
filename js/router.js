let _handler = null;

export function onRoute(fn) { _handler = fn; }

export function navigate(path) { window.location.hash = path; }

export function back() { window.history.back(); }

export function initRouter() {
  window.addEventListener('hashchange', _dispatch);
  _dispatch();
}

function _dispatch() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.replace(/^\//, '').split('/');
  const route = { section: parts[0] || 'home', id: parts[1] || null, sub: parts[2] || null };
  if (_handler) _handler(route);
}

export function currentRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.replace(/^\//, '').split('/');
  return { section: parts[0] || 'home', id: parts[1] || null, sub: parts[2] || null };
}
