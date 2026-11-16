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
    return this.page.locator('form').filter({ has: this.page.getByRole('button', { name: /^(Save Transaction|Save Investment|Transfer|Save Changes|Saving…)$/ }) });
  }

  async open() {
    await this.page.getByRole('button', { name: '+ Add Expenses' }).click();
    await expect(this.page.getByRole('heading', { name: 'Add Expenses' })).toBeVisible();
    // The form loads categories, accounts and fixed-expense templates after it opens; which
    // categories are listed depends on all three, so wait for them before interacting.
    await this.page.waitForLoadState('networkidle');
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

  /** Date field (YYYY-MM-DD): opens the calendar, moves to the month, clicks the in-month day. */
  async date(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    await this.form.getByRole('button', { name: /^Date/ }).click();
    const header = this.page.locator('span').filter({ hasText: new RegExp(`^(${FULL.join('|')})\\s*\\d{4}$`) }).first();
    for (let i = 0; i < 36; i++) {
      const [name, year] = ((await header.textContent()) ?? '').match(/^(\D+?)\s*(\d{4})$/)!.slice(1);
      const shown = Number(year) * 12 + FULL.indexOf(name.trim());
      const want = y * 12 + (m - 1);
      if (shown === want) break;
      await this.page.getByRole('button', { name: shown > want ? '‹' : '›', exact: true }).last().click();
    }
    // Neighbouring-month days are drawn faded (opacity 0.4) in the same grid; click the in-month one.
    const index = await this.page.getByRole('button', { name: String(d), exact: true })
      .evaluateAll((els) => els.findIndex((e) => getComputedStyle(e).opacity === '1'));
    await this.page.getByRole('button', { name: String(d), exact: true }).nth(index).click();
  }

  /** Category names offered in the picker (search box empty). */
  async categoryOptions(): Promise<string[]> {
    await this.categoryPicker.click();
    const list = this.page.getByRole('listbox');
    await expect(list).toBeVisible();
    // Options are the children of the scrolling list; group headings ("Special") are not options.
    // The user's categories load after the form opens, so wait until more than the Special group is listed.
    const read = () => list.evaluate((lb) => {
      const scroller = Array.from(lb.children).find((c) => (c as HTMLElement).style.overflowY === 'auto') ?? lb;
      return Array.from(scroller.children)
        .filter((c) => (c as HTMLElement).style.cursor === 'pointer')
        .map((c) => c.textContent?.trim() ?? '');
    });
    await expect.poll(async () => (await read()).length, { message: 'categories loaded', timeout: 20_000 }).toBeGreaterThan(3);
    // The list is filtered again once fixed-expense templates arrive; read it until it stops changing.
    let names = await read();
    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1_000);
      const again = await read();
      if (again.join('|') === names.join('|')) break;
      names = again;
    }
    await this.page.keyboard.press('Escape');
    return names;
  }

  /** Investment mode: "Step 2 — Which investment?" */
  async investment(accountName: string) {
    await selectOptionStartingWith(this.form.locator('select').filter({ has: this.page.locator('option', { hasText: 'Select investment…' }) }), accountName);
  }

  /** Fixed Expenses mode: "Step 2 — Which fixed expense?" (pre-fills amount and description). */
  async fixedExpense(templateName: string) {
    await selectOptionStartingWith(this.form.locator('select').filter({ has: this.page.locator('option', { hasText: 'Select fixed expense…' }) }), templateName);
  }

  /** Fixed Expenses mode: "Paying for Month" (YYYY-MM); defaults to the current month. */
  async payingForMonth(month: string) {
    const [y, m] = month.split('-').map(Number);
    await this.form.getByRole('button', { name: /^Paying for Month/ }).click();
    const year = this.page.locator('span', { hasText: /^\d{4}$/ }).first();
    for (let i = 0; i < 5; i++) {
      const shown = Number(await year.textContent());
      if (shown === y) break;
      await this.page.getByRole('button', { name: shown > y ? '‹' : '›', exact: true }).last().click();
    }
    await this.page.getByRole('button', { name: MONTH_SHORT[m - 1], exact: true }).click();
  }

  async transfer(from: string, to: string) {
    await selectOptionStartingWith(this.form.getByLabel('From account'), from);
    await selectOptionStartingWith(this.form.getByLabel('To account'), to);
  }

  async loanPerson(name: string) {
    await this.form.getByLabel('Person').fill(name);
  }

  async loanDirection(label: 'I gave' | 'I received') {
    await this.form.getByLabel('Direction').selectOption({ label });
  }

  async loanReason(text: string) {
    await this.form.getByLabel('Reason').fill(text);
  }

  /** Text of the form's error line, or null when there is none. */
  async errorText(): Promise<string | null> {
    const err = this.form.locator('div[style*="var(--danger)"]');
    return (await err.count()) ? (await err.first().textContent())?.trim() ?? null : null;
  }

  async cancel() {
    await this.form.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.page.getByRole('heading', { name: /Add Expenses|Edit Transaction/ })).toBeHidden();
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
    // The form's error line (red caption above the buttons) — not option texts that may also match.
    await expect(this.form.locator('div[style*="var(--danger)"]').first()).toHaveText(message);
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

  /** Other Income: the Income Type select ('Cheer', 'Profit Share', 'Bank Savings Interest', …). */
  async incomeType(label: string) {
    await this.dialog.getByLabel('Income Type').selectOption({ label });
  }

  async text(label: 'Payer Name' | 'Earned Period' | 'Employer' | 'Employer / Source' | 'Notes', value: string) {
    await this.dialog.getByLabel(label, { exact: false }).first().fill(value);
  }

  taxableCheckbox(): Locator {
    return this.dialog.getByLabel('Taxable income');
  }

  /** Error line inside the dialog. */
  error(): Locator {
    return this.dialog.locator('div[style*="var(--danger)"]');
  }

  /** Values pre-filled in a money field (MoneyInput shows the BDT amount). */
  async moneyValue(label: string): Promise<string> {
    return this.dialog.getByLabel(label).inputValue();
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

  /** Fiscal Year dropdown at the top of the Tax page ("FY2025-26"). */
  async selectFY(fy: string) {
    await this.page.locator('main select').filter({ has: this.page.locator('option', { hasText: `FY${fy}` }) }).first().selectOption({ label: `FY${fy}` });
    await expect(this.page.getByText('TAX SITUATION')).toBeVisible({ timeout: 20_000 });
    await this.page.waitForLoadState('networkidle');
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
    await expect(this.page.getByText(/Showing \d+ of \d+ transactions|No transactions/)).toBeVisible({ timeout: 60_000 });
  }

  /** Row = checkbox · category · method · date · description · amount · ⚡ button. */
  private rowByDescription(description: string): Locator {
    // Start from each row's own ⚡ button and take its nearest ancestor holding a checkbox: exactly one
    // row. (Matching any div with checkbox + ⚡ + text also hits the list container once the category
    // filter's <option>s — which include every category name — have loaded.)
    return this.page.getByRole('button', { name: '⚡' })
      .locator('xpath=ancestor::div[.//input[@type="checkbox"]][1]')
      .filter({ hasText: description });
  }

  async action(description: string, action: 'Edit' | 'Remove') {
    await this.rowByDescription(description).getByRole('button', { name: '⚡' }).click();
    await this.page.getByRole('button', { name: action, exact: true }).click();
  }

  /** ⚡ → Remove → confirm. */
  async remove(description: string) {
    await this.action(description, 'Remove');
    await this.page.getByRole('button', { name: 'Remove', exact: true }).last().click();
    await expect(this.rowByDescription(description)).toHaveCount(0, { timeout: 15_000 });
  }

  /** Ticks the rows, clicks "Delete selected" and confirms. */
  async bulkDelete(descriptions: string[]) {
    for (const d of descriptions) await this.rowByDescription(d).locator('input[type="checkbox"]').check();
    await this.page.getByRole('button', { name: 'Delete selected' }).click();
    await this.page.getByRole('button', { name: `Delete ${descriptions.length}` }).click();
    for (const d of descriptions) await expect(this.rowByDescription(d)).toHaveCount(0, { timeout: 15_000 });
  }

  /** ⚡ → Edit opens the Edit Transaction form; returns once it is visible. */
  async openEdit(description: string) {
    await this.action(description, 'Edit');
    await expect(this.page.getByRole('heading', { name: 'Edit Transaction' })).toBeVisible();
  }

  /** In the edit form: Save Changes → Confirm & Save. */
  async saveEdit() {
    await this.page.locator('form').getByRole('button', { name: 'Save Changes' }).click();
    const confirm = this.page.getByRole('button', { name: 'Confirm & Save' });
    if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) await confirm.click();
    await expect(this.page.getByRole('heading', { name: 'Edit Transaction' })).toBeHidden({ timeout: 15_000 });
  }

  /**
   * The visible list row that shows this description together with this amount (e.g. '−৳1,500.00').
   * (The description cell itself is ellipsis-clipped and can report as hidden, so assert on the row.)
   */
  row(description: string, amountText: string): Locator {
    return this.page.locator('main *').filter({ hasText: description }).filter({ hasText: amountText }).filter({ visible: true }).last();
  }
}

// ── Loans ──────────────────────────────────────────────────────────────────
export class LoansPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/loans');
    await waitForApp(this.page);
    await expect(this.page.getByText('Net Position')).toBeVisible({ timeout: 60_000 });
  }

  /** Summary figure: 'I Owe (Total)' | 'Owed to Me' | 'Net Position'. Text reads "Owed to Me ৳5,000.00 1 people". */
  async summary(label: 'I Owe (Total)' | 'Owed to Me' | 'Net Position'): Promise<number> {
    const text = (await this.page.locator('main').textContent()) ?? '';
    const m = text.match(new RegExp(`${label.replace(/[()]/g, '\\$&')}\\s*([+−-]?৳[\\d,]+\\.\\d{2})`));
    if (!m) throw new Error(`No "${label}" figure on Loans`);
    return parsePaisa(m[1]);
  }

  /** The person's card text, e.g. "Mithun +৳5,000.00 · Mithun owes you ৳5,000.00". */
  personCard(name: string): Locator {
    // The card = header row (name + balance — separate elements, so "Mithun+৳5,000.00" with no space)
    // + the "Mithun owes you ৳…" / "You owe Sohel ৳…" / "Settled" line + actions. Matching all of it and
    // taking the last (deepest) match gives the card, not the list that holds every card. A settled
    // person (৳0) has no Settle Up button, so the button is not required.
    return this.page.locator('main div')
      .filter({ hasText: new RegExp(`${name}\\s*[+−-]?৳`) })
      .filter({ hasText: new RegExp(`${name} owes you|You owe ${name}|Settled`) })
      .filter({ has: this.page.getByRole('button', { name: 'Edit person' }) }).last();
  }

  /**
   * Opens a person's card. With several people the page is master-detail: a list of names and the
   * selected person's card, so click the name in the list first (a single person is shown directly).
   */
  async select(name: string) {
    if (await this.personCard(name).count()) return;
    await this.page.locator('main').getByText(name, { exact: true }).first().click();
    await expect(this.personCard(name)).toBeVisible();
  }

  /** Signed running balance shown on the card (+ they owe you, − you owe them). */
  async balance(name: string): Promise<number> {
    await this.select(name);
    const text = (await this.personCard(name).textContent()) ?? '';
    const m = text.match(new RegExp(`${name}\\s*([+−-]?৳[\\d,]+\\.\\d{2})`));
    if (!m) throw new Error(`No balance for ${name}`);
    return parsePaisa(m[1]);
  }

  async settleUp(name: string) {
    await this.select(name);
    await this.personCard(name).getByRole('button', { name: 'Settle Up' }).click();
    await expect(this.page.getByRole('heading', { name: `Settle Up with ${name}` })).toBeVisible();
  }
}

// ── Fixed Expenses ─────────────────────────────────────────────────────────
export class FixedExpensesPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/fixed-expenses');
    await waitForApp(this.page);
    await expect(this.page.getByRole('heading', { name: /This Month/ })).toBeVisible({ timeout: 60_000 });
  }

  /** Banners at the top of the page ("Overdue: Mess Rent ৳8,722.00", "Due soon: …"). */
  alerts(): Locator {
    return this.page.getByRole('alert');
  }
}

// ── Budgets ────────────────────────────────────────────────────────────────
export class BudgetsPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/budgets');
    await waitForApp(this.page);
    await expect(this.page.getByText('Total Budget')).toBeVisible({ timeout: 60_000 });
  }

  /** "৳1,200.00 spent / ৳5,000.00 limit 24%" for a category. */
  async line(category: string): Promise<{ spent: number; limit: number; pct: number }> {
    const text = (await this.page.locator('main').textContent()) ?? '';
    const m = text.match(new RegExp(`${category}[^৳]*?(৳[\\d,]+\\.\\d{2}) spent / (৳[\\d,]+\\.\\d{2}) limit\\s*(\\d+)%`));
    if (!m) throw new Error(`No budget line for ${category}`);
    return { spent: parsePaisa(m[1]), limit: parsePaisa(m[2]), pct: Number(m[3]) };
  }
}

// ── Income page ────────────────────────────────────────────────────────────
export class IncomePage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/income');
    await waitForApp(this.page);
    await expect(this.page.getByRole('button', { name: '+ Add Income' }).last()).toBeVisible();
  }

  /** Month row by its label, e.g. "Nov 2026". */
  row(monthLabel: string): Locator {
    return this.page.locator('main div').filter({ hasText: monthLabel }).filter({ has: this.page.getByTitle(/Show details|Hide details|Enter income for this month/) }).last();
  }

  async showDetails(monthLabel: string) {
    await this.row(monthLabel).getByTitle('Show details').click();
    await expect(this.breakdown(monthLabel)).toBeVisible();
  }

  /**
   * The "↳ BREAKDOWN · NOV 2026" panel of one month. (Business Findings F-34: expanding a month also
   * renders its breakdown under the Pending months, so always target the panel by its own label.)
   */
  breakdown(monthLabel: string): Locator {
    return this.page.locator('main div').filter({ has: this.page.getByText(`↳ BREAKDOWN · ${monthLabel.toUpperCase()}`, { exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: 'Edit', exact: true }) }).last();
  }

  async entryAction(monthLabel: string, action: 'Edit' | 'Delete') {
    await this.breakdown(monthLabel).getByRole('button', { name: action, exact: true }).first().click();
  }
}

/** "Nov 2026" for YYYY-MM, as the Income page writes it. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

/** Notification bell → list of messages. */
export async function notifications(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: /^Notifications/ }).click();
  const panel = page.getByRole('dialog').filter({ hasText: /Notification/i }).last();
  await expect(panel).toBeVisible();
  const texts = await panel.locator('li, [role="listitem"], div').allTextContents();
  await page.keyboard.press('Escape');
  return texts.map((t) => t.trim()).filter(Boolean);
}
