/**
 * Page objects for the money-flow journeys. Locators follow what a user sees (labels, button
 * text, option text); the few structural hooks are documented where they are used.
 * Amounts are read from the `title` of <Amount> spans, which holds the exact signed value.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { MONTH_SHORT } from './dates';
import { parsePaisa } from './money';

/**
 * Waits for the signed-in app shell. The desktop top bar (with "+ Add Expenses") renders only after
 * the session restores. (A plain `header` locator is ambiguous: the mobile bottom nav is also a
 * <header>, hidden on desktop.)
 */
export async function waitForApp(page: Page) {
  await page.getByRole('button', { name: '+ Add Expenses' }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

async function selectOptionStartingWith(select: Locator, prefix: string) {
  // Pickers appear (and fill) only after an earlier choice re-renders the form, so wait for the option.
  await expect(select.locator('option').filter({ hasText: prefix }).first(), `option "${prefix}"`).toBeAttached();
  const options = await select.locator('option').evaluateAll((els) => els.map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent?.trim() ?? '' })));
  const hit = options.find((o) => o.t === prefix || o.t.startsWith(`${prefix} ·`) || o.t.startsWith(`${prefix} (`));
  if (!hit) throw new Error(`No option starting with "${prefix}". Options: ${options.map((o) => o.t).join(' | ')}`);
  await select.selectOption(hit.v);
}

/** Visible option texts of a <select>, for "is / is not offered" checks. */
export async function optionTexts(select: Locator): Promise<string[]> {
  await expect.poll(() => select.locator('option').count(), { message: 'options loaded' }).toBeGreaterThan(1);
  return select.locator('option').evaluateAll((els) => els.map((o) => o.textContent?.trim() ?? ''));
}

// ── Add Expenses ───────────────────────────────────────────────────────────
export class AddExpensesForm {
  constructor(private page: Page) {}

  /** The modal's <form> (the heading sits just outside it). */
  get form(): Locator {
    return this.page.locator('form').filter({ has: this.page.getByRole('button', { name: /^(Save Transaction|Save Investment|Transfer|Saving…)$/ }) });
  }

  async open() {
    await this.page.getByRole('button', { name: '+ Add Expenses' }).click();
    await expect(this.page.getByRole('heading', { name: 'Add Expenses' })).toBeVisible();
  }

  /** The searchable category picker (a div[role=combobox]; native <select>s are comboboxes too). */
  get categoryPicker(): Locator {
    return this.form.locator('div[role="combobox"]');
  }

  async category(name: string) {
    await this.categoryPicker.click();
    const list = this.page.getByRole('listbox');
    await list.getByPlaceholder('Search categories…').fill(name);
    await list.getByText(name, { exact: true }).click();
    await expect(this.categoryPicker).toContainText(name);
  }

  /** 'Cash' or 'Bank / MFS'. */
  async paymentMethod(label: 'Cash' | 'Bank / MFS') {
    await this.form.locator('select').filter({ has: this.page.locator('option[value="CASH"]') }).first().selectOption({ label });
  }

  /** "Which account are you paying from?" / "…receives the money?" picker shown for Bank / MFS. */
  get payFromSelect(): Locator {
    return this.form.locator('select').filter({ has: this.page.locator('option', { hasText: /^(Choose an account…|Select bank account…)$/ }) });
  }

  async payFrom(accountName: string) {
    await selectOptionStartingWith(this.payFromSelect, accountName);
  }

  async savingsAccount(accountName: string) {
    await this.form.getByLabel('Savings Account').selectOption({ label: accountName });
  }

  async description(text: string) {
    await this.form.getByLabel('Description').fill(text);
  }

  async amount(bdt: string) {
    await this.form.getByLabel('Amount (৳)').fill(bdt);
  }

  /** The caption under Payment Method when Cash is chosen. */
  cashNote(): Locator {
    return this.form.getByText(/Paid from In-Hand Cash|Add an In-Hand Cash account/);
  }

  async save() {
    await this.form.getByRole('button', { name: /^(Save Transaction|Save Investment|Transfer)$/ }).click();
    await expect(this.page.getByRole('heading', { name: 'Add Expenses' })).toBeHidden({ timeout: 15_000 });
  }

  /** Clicks save and expects the form to stay open with an error matching `message`. */
  async saveExpectingError(message: RegExp) {
    await this.form.getByRole('button', { name: /^(Save Transaction|Save Investment|Transfer)$/ }).click();
    await expect(this.form.getByText(message)).toBeVisible();
  }
}

// ── Add Income ─────────────────────────────────────────────────────────────
export class AddIncomeForm {
  constructor(private page: Page) {}

  get dialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByText('Year & Month') });
  }

  async open() {
    await this.page.getByRole('button', { name: '+ Add Income' }).click();
    await expect(this.dialog).toBeVisible();
  }

  async kind(kind: 'Salary' | 'Other Income') {
    await this.dialog.getByRole('button', { name: kind, exact: true }).click();
  }

  /** month = YYYY-MM. Opens the month picker, moves to the year, clicks the month. */
  async month(month: string) {
    const [y, m] = month.split('-').map(Number);
    // The picker button sits inside the field's <label>, so its accessible name is the label text.
    await this.dialog.getByRole('button', { name: /^Year & Month/ }).click();
    const yearLabel = this.dialog.locator('span', { hasText: /^\d{4}$/ }).first();
    for (let i = 0; i < 5; i++) {
      const shown = Number(await yearLabel.textContent());
      if (shown === y) break;
      await this.dialog.getByRole('button', { name: shown > y ? '‹' : '›', exact: true }).first().click();
    }
    await this.dialog.getByRole('button', { name: MONTH_SHORT[m - 1], exact: true }).click();
  }

  async moneyField(label: string, bdt: string) {
    await this.dialog.getByLabel(label).fill(bdt);
  }

  async receivedInto(accountName: string) {
    await selectOptionStartingWith(this.dialog.getByLabel('Received into'), accountName);
  }

  async save() {
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.dialog).toBeHidden({ timeout: 15_000 });
  }
}

// ── Bank & Wallet ──────────────────────────────────────────────────────────
export class BankWalletPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/savings');
    await waitForApp(this.page);
    await expect(this.page.locator('.summary-tile', { hasText: 'Net Worth' })).toBeVisible();
  }

  /** Summary tile value: 'Net Worth' | 'Bank Balance' | 'MFS Balance' | 'Cash on Hand' | 'Investments'. */
  async tile(label: string): Promise<number> {
    return readTile(this.page, label);
  }

  /**
   * Balance on an account line. AccountLine = <div flex>[<div><div>{name}</div><div>details</div></div><div><Amount/></div>]
   * — the balance is the Amount in the line's last column (the details column may hold an installment Amount).
   */
  async balance(accountName: string): Promise<number> {
    // The card header above each line repeats the bank name / type in <span>s, so match the
    // AccountLine shape itself: first column's first <div> is the name, last column holds the Amount.
    const amountCls = "contains(concat(' ',normalize-space(@class),' '),' amount ')";
    const line = this.page.locator(
      `xpath=//div[div[1]/div[1][normalize-space(.)=${JSON.stringify(accountName)}] and div[last()]//span[${amountCls}]]`,
    );
    await expect(line, `account line for ${accountName}`).toHaveCount(1);
    return parsePaisa(await line.locator(`xpath=div[last()]//span[${amountCls}]`).first().getAttribute('title'));
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export class DashboardPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/');
    await waitForApp(this.page);
    await expect(this.page.locator('.summary-tile', { hasText: 'Spending' }).first()).toBeVisible();
  }

  /** 'Income' | 'Spending' | 'Net Savings' (Amount tiles). */
  async tile(label: string): Promise<number> {
    return readTile(this.page, label);
  }

  /** Tax snapshot card: <div><span>Paid so far</span><div><Amount/></div></div>. */
  async taxCard(label: 'Paid so far'): Promise<number> {
    const cell = this.page.locator('div').filter({ has: this.page.locator(`xpath=./span[normalize-space()=${JSON.stringify(label)}]`) }).last();
    return parsePaisa(await cell.locator('.amount').first().getAttribute('title'));
  }

  /** Text tiles such as 'Savings Rate' ("98.1%" or "—"). */
  async tileText(label: string): Promise<string> {
    const tile = this.page.locator('.summary-tile').filter({ has: this.page.getByText(label, { exact: true }) }).first();
    return (await tile.locator(':scope > span').first().textContent())?.trim() ?? '';
  }
}

async function readTile(page: Page, label: string): Promise<number> {
  const tile = page.locator('.summary-tile').filter({ has: page.getByText(label, { exact: true }) }).first();
  await expect(tile).toBeVisible();
  return parsePaisa(await tile.locator('.amount').first().getAttribute('title'));
}

// ── Tax ────────────────────────────────────────────────────────────────────
export class TaxPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/tax');
    await waitForApp(this.page);
    await expect(this.page.getByText('TAX SITUATION')).toBeVisible({ timeout: 20_000 });
  }

  /** A label/value row of the Overview tab, e.g. 'Net Tax Payable', 'Total Paid', 'Remaining to Pay'. */
  async row(label: string): Promise<number> {
    // Row = <div><span>{label}</span><span>{value}</span></div>. Several spans can carry the same
    // label text (tiles, other tabs), so take the first one whose next sibling holds an amount.
    const read = () => this.page.evaluate((lbl) => {
      for (const s of Array.from(document.querySelectorAll('span'))) {
        if (s.textContent?.trim() !== lbl) continue;
        const v = s.nextElementSibling?.textContent?.trim() ?? '';
        if (/\d/.test(v)) return v;
      }
      return null;
    }, label);
    await expect.poll(read, { message: `tax row "${label}"` }).not.toBeNull();
    return parsePaisa(await read());
  }

  async hasRow(label: string): Promise<boolean> {
    return (await this.page.locator(`xpath=//span[normalize-space()=${JSON.stringify(label)}]`).count()) > 0;
  }
}

// ── Transactions ───────────────────────────────────────────────────────────
export class TransactionsPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/transactions');
    await waitForApp(this.page);
  }

  /**
   * The visible list row that shows this description together with this amount (e.g. '−৳1,500.00').
   * (The description cell itself is ellipsis-clipped and can report as hidden, so assert on the row.)
   */
  row(description: string, amountText: string): Locator {
    return this.page.locator('main *').filter({ hasText: description }).filter({ hasText: amountText }).filter({ visible: true }).last();
  }
}
