/** Short-hands used by the area specs. */
import type { Page } from '@playwright/test';
import type { AddExpensesForm } from './pages';
import { waitForApp } from './pages';

export async function startAt(page: Page, url = '/') {
  await page.goto(url);
  await waitForApp(page);
}

export type Expense = {
  category: string;
  method?: 'Cash' | 'Bank / MFS';
  from?: string;          // paying (or receiving) account for Bank / MFS
  savings?: string;       // Savings Account for deposit / withdrawal
  person?: string;        // loan person
  reason?: string;
  description?: string;
  amount: string;         // BDT as typed, e.g. '1500' or '1,25,000.75' → typed without commas
};

/** Opens Add Expenses and fills it the way a user would; does not save. */
export async function fillExpense(f: AddExpensesForm, e: Expense) {
  await f.open();
  await f.category(e.category);
  if (e.method) await f.paymentMethod(e.method);
  if (e.from) await f.payFrom(e.from);
  if (e.savings) await f.savingsAccount(e.savings);
  if (e.person) await f.loanPerson(e.person);
  if (e.reason) await f.loanReason(e.reason);
  await f.description(e.description ?? `${e.category} ${e.amount}`);
  await f.amount(e.amount.replace(/,/g, ''));
}

/** Fill + save. */
export async function addExpense(f: AddExpensesForm, e: Expense) {
  await fillExpense(f, e);
  await f.save();
}
