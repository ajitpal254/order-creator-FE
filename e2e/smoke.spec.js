import { test, expect } from '@playwright/test';

// End-to-end smoke (QOL-04): signup -> create order -> download invoice PDF.
//
// Requires the REAL backend + frontend running (see playwright.config.js).
// Selectors follow the current pages as far as they allow: form fields are
// located by their visible labels/placeholders, actions by button text.
// A unique buyer is registered per run so the spec is re-runnable.

const stamp = Date.now();
const buyer = {
  customerName: 'Smoke Test Buyer',
  businessName: 'Smoke Test Imports LLC',
  phoneNumber: '+1 (555) 010-2030',
  address: '1 Smoke Test Way, Houston, TX 77001, USA',
  username: `smoke_${stamp}`,
  email: `smoke_${stamp}@example.com`,
  password: 'smoke-test-password-10',
};

test('signup -> create order -> download invoice PDF', async ({ page }) => {
  // ---- Signup -------------------------------------------------------------
  await page.goto('/signup');
  await expect(page.getByText('Register Importer / Business Account')).toBeVisible();

  await page.getByPlaceholder('e.g. Johnathan Smith').fill(buyer.customerName);
  await page.getByPlaceholder('e.g. Apex Industrial Supplies LLC').fill(buyer.businessName);
  await page.getByPlaceholder('e.g. +1 (555) 349-2910').fill(buyer.phoneNumber);
  await page
    .getByPlaceholder('e.g. Suite 400, Industrial Parkway, Houston, TX 77001, USA')
    .fill(buyer.address);
  await page.getByPlaceholder('e.g. apex_tools').fill(buyer.username);
  await page.getByPlaceholder('buyer@company.com').fill(buyer.email);
  await page.getByPlaceholder('Minimum 6 characters').fill(buyer.password);

  await page
    .getByRole('button', { name: /complete registration & open order creator/i })
    .click();

  // Signup auto-redirects to the order creator.
  await expect(page).toHaveURL(/\/order-creator/);
  await expect(page.getByText('Interactive Order Creator')).toBeVisible();

  // ---- Create order ---------------------------------------------------------
  // The configurator preselects the first catalogue product with its MOQ and
  // base price; add it as a line item, then submit.
  await page.getByRole('button', { name: /add line item/i }).click();
  await expect(page.getByText(/Active Order Sheet \(1 Item\)/)).toBeVisible();

  await page
    .getByRole('button', { name: /submit order to h\.a\. overseas/i })
    .click();

  await expect(page.getByText('Order Submitted Successfully!')).toBeVisible();
  await expect(page.getByText(/Order Reference #/)).toBeVisible();

  // ---- Download invoice PDF ---------------------------------------------------
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /download purchase order pdf/i })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
});
