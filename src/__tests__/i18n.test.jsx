import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n/index.js';
import { en } from '../i18n/en.js';
import { hi } from '../i18n/hi.js';
import { formatDate } from '../i18n/format.js';
import App from '../App';
import { InstallBanner } from '../components/InstallBanner';

// FE-15 (v0.9 F2): i18n resources parity, EN <-> Hindi chrome switching,
// locale-aware formatting, and the PWA install banner.

function flattenKeys(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flattenKeys(value, path, out);
    else out.push(path);
  }
  return out;
}

afterEach(async () => {
  // Never leak a non-English language into other suites sharing this file.
  await i18n.changeLanguage('en');
});

describe('i18n resources (FE-15)', () => {
  it('en and hi expose identical key sets', () => {
    const enKeys = flattenKeys(en).sort();
    const hiKeys = flattenKeys(hi).sort();
    expect(hiKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(100);
  });

  it('every hi value is a non-empty string', () => {
    const walk = (obj) => {
      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') walk(value);
        else expect(typeof value === 'string' && value.length > 0).toBe(true);
      }
    };
    walk(hi);
  });
});

describe('language switching (FE-15)', () => {
  it('re-renders chrome strings in Hindi and back, persisting the choice', async () => {
    const user = userEvent.setup();
    render(<App />);

    // English chrome by default.
    expect(await screen.findByText('Tools Catalog')).toBeInTheDocument();
    expect(screen.getByText('Hand Tools & Grease Guns Manufacturer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'हिंदी' }));

    expect(await screen.findByText('टूल्स कैटलॉग')).toBeInTheDocument();
    expect(screen.getByText('हैंड टूल्स और ग्रीस गन निर्माता')).toBeInTheDocument();
    expect(window.localStorage.getItem('hao-language')).toBe('hi');

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(await screen.findByText('Tools Catalog')).toBeInTheDocument();
    expect(window.localStorage.getItem('hao-language')).toBe('en');
  });

  it('formats dates with the active locale', async () => {
    const date = new Date('2026-12-15T12:00:00Z');
    expect(formatDate(date)).toBe('Dec 15, 2026');
    await i18n.changeLanguage('hi');
    const hindi = formatDate(date);
    expect(hindi).not.toBe('Dec 15, 2026');
    expect(hindi).toContain('15');
    expect(hindi).toContain('2026');
  });
});

describe('PWA install banner (FE-15)', () => {
  const fireInstallPrompt = () => {
    const event = new Event('beforeinstallprompt');
    event.preventDefault = () => {};
    event.prompt = () => {};
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    act(() => {
      window.dispatchEvent(event);
    });
  };

  it('shows on beforeinstallprompt and persists dismissal', async () => {
    const user = userEvent.setup();
    render(<InstallBanner />);
    expect(screen.queryByText('Install the H.A. Overseas app')).not.toBeInTheDocument();

    fireInstallPrompt();
    expect(await screen.findByText('Install the H.A. Overseas app')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Install the H.A. Overseas app')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('hao-install-dismissed')).toBe('1');
  });
});
