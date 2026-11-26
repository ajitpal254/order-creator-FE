import { useEffect } from 'react';

// Tiny head helper (v0.9 F3): sets document.title plus description /
// Open Graph / Twitter meta tags, creating tags that don't exist yet.
// No dependency — just DOM. Values are restored on unmount is NOT done:
// pages set their own meta when they mount.

const setMeta = (selector, create, content) => {
  if (content == null || content === '') return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const metaByName = (name) => () => {
  const el = document.createElement('meta');
  el.setAttribute('name', name);
  return el;
};

const metaByProperty = (property) => () => {
  const el = document.createElement('meta');
  el.setAttribute('property', property);
  return el;
};

export function applyPageMeta({ title, description, image, type = 'website' } = {}) {
  if (typeof document === 'undefined') return;
  if (title) document.title = title;
  setMeta('meta[name="description"]', metaByName('description'), description);
  setMeta('meta[property="og:title"]', metaByProperty('og:title'), title);
  setMeta(
    'meta[property="og:description"]',
    metaByProperty('og:description'),
    description
  );
  setMeta('meta[property="og:type"]', metaByProperty('og:type'), type);
  setMeta('meta[property="og:image"]', metaByProperty('og:image'), image);
  setMeta('meta[name="twitter:card"]', metaByName('twitter:card'), 'summary');
  setMeta('meta[name="twitter:title"]', metaByName('twitter:title'), title);
  setMeta(
    'meta[name="twitter:description"]',
    metaByName('twitter:description'),
    description
  );
}

// React hook form: usePageMeta({ title, description, image, type })
export function usePageMeta(meta) {
  const { title, description, image, type } = meta || {};
  useEffect(() => {
    applyPageMeta({ title, description, image, type });
  }, [title, description, image, type]);
}
