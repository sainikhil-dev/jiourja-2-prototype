import { expect, test, type Page } from '@playwright/test';

/** Click a console sidebar link, opening the mobile menu first when needed. */
async function sidebar(page: Page, name: string) {
  await page.getByLabel('Signed-in role').waitFor();
  const menu = page.getByRole('button', { name: 'Open menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name }).first().click();
}

/**
 * Scripted version of the competition demo (section 19): customer enquiry →
 * partner console review → customer follow-up → service ticket loop.
 * Every step uses the real UI; nothing is injected into storage.
 */
test('end-to-end Pune MSME journey', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 1–9 Customer experience
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Guided Demo' }).click();
  await expect(page.getByText(/Guided demo · 1\/16/)).toBeVisible();
  await page.getByRole('button', { name: /Try Sample Pune Factory/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByLabel('Business or factory name')).toHaveValue('Shree Ganesh Industries');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Yes, this is my factory rooftop/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /See my estimate/ }).click();
  await expect(page.getByRole('heading', { name: 'Your JioUrja Energy Plan' })).toBeVisible();
  await expect(page.getByText('Approximate monthly savings')).toBeVisible();
  await page.getByRole('button', { name: /Compare payment options/ }).click();
  await page.getByRole('button', { name: 'Choose this plan' }).first().click();
  await expect(page.getByText(/sent to JioUrja for commercial review/)).toBeVisible();
  await page.getByRole('button', { name: /Book My Free Site Assessment/ }).click();
  await page.getByRole('button', { name: /Request visit/ }).click();
  await expect(page.getByText('Visit request received')).toBeVisible();

  // 10–19 Partner console
  await page.goto('/partner');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await sidebar(page, 'Customer Pipeline');
  await page.getByRole('link', { name: 'Shree Ganesh Industries' }).first().click();
  await expect(page.getByText('New portal enquiry').or(page.getByText('Customer tracker (as the customer sees it)'))).toBeVisible();
  await page.getByRole('link', { name: 'Open roof tool →' }).click();
  await page.getByLabel('Time of day').fill('16');
  await expect(page.getByText(/of modelled panel output is shaded/)).toBeVisible();
  await page.getByRole('button', { name: 'Mark Roof Assessment Verified' }).click();
  await expect(page.getByRole('button', { name: 'Roof assessment verified' })).toBeVisible();

  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('jiourja2.state')!).customers[0].id);
  await sidebar(page, 'Commercial Assessment');
  await page.getByLabel('Select customer').selectOption(id);
  await page.getByText('Business identity verified').click();
  await page.getByLabel('Commercial approval status').selectOption('suitable_for_ppa');

  await sidebar(page, 'Energy Studio');
  await page.getByLabel('Select customer').selectOption(id);
  await expect(page.getByText('24-hour interval profile (hourly)')).toBeVisible();
  await page.getByRole('tab', { name: 'Solar vs Solar + BESS' }).click();
  await expect(page.getByText('Scenario comparison')).toBeVisible();
  await page.getByRole('tab', { name: 'Financial model' }).click();
  await expect(page.getByText('Provider (JioUrja) — PPA asset')).toBeVisible();
  await page.getByRole('button', { name: 'Mark electricity assessment reviewed' }).click();

  await sidebar(page, 'Installation & Maintenance');
  const row = page.getByRole('row', { name: /Shree Ganesh Industries/ });
  await row.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm visit' }).click();
  await expect(row.getByText('confirmed')).toBeVisible();

  // 20–21 Customer follow-up
  await page.goto('/my');
  await expect(page.getByText('Roof checked and verified')).toBeVisible();
  await expect(page.getByText('confirmed').first()).toBeVisible();

  // 22–24 Active installation + maintenance request
  await page.getByRole('link', { name: 'Switch demo customer' }).click();
  await page.getByRole('button', { name: /Mahalaxmi Food Products/ }).click();
  await expect(page.getByText('Your solar system is working well.')).toBeVisible();
  await page.getByRole('tab', { name: 'Savings' }).click();
  await expect(page.getByText('Last six months')).toBeVisible();
  await page.getByRole('tab', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Request an engineer' }).click();
  await page.getByPlaceholder('Describe the issue').fill('Panels look dusty, output seems low');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText('Request an engineer').last()).toBeVisible();

  // 25 Staff resolves the ticket
  await page.goto('/console/operations?tab=tickets');
  await page.getByRole('button', { name: /Request an engineer/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark resolved' }).click();

  // 26 Customer sees the update
  await page.goto('/my');
  await page.getByRole('tab', { name: 'Help' }).click();
  await expect(page.getByRole('button', { name: /Request an engineer.*resolved/ })).toBeVisible();

  // 27 Pay an overdue bill from the customer portal and confirm the console reflects it
  await page.getByRole('link', { name: 'Switch demo customer' }).click();
  await page.getByRole('button', { name: /Deccan Precision Tools/ }).click();
  await expect(page.getByText(/Payment overdue/)).toBeVisible();
  await page.getByRole('button', { name: 'Pay Now' }).click();
  await page.getByRole('button', { name: /^Pay ₹/ }).click();
  await expect(page.getByText('Payment confirmed')).toBeVisible();
  await expect(page.getByText(/Reference JU-/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(/Payment overdue/)).not.toBeVisible();

  await page.goto('/console/pipeline');
  await page.getByRole('link', { name: 'Deccan Precision Tools' }).first().click();
  await expect(page.getByText('Up to date')).toBeVisible();

  expect(errors).toEqual([]);
});
