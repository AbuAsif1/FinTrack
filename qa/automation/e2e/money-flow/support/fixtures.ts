/**
 * `test` for money-flow journeys. Every test gets:
 *   user — a brand-new verified user, signed in in the browser, deleted after the test
 *   api  — REST client authorised as that user (setup + exact read-backs)
 *
 * Because no two tests share a user, the suite runs the same way with --workers=1 or --workers=N.
 */
import { test as base, expect } from '@playwright/test';
import { Api } from './api';
import { createFreshUser, deleteUser, type FreshUser } from './db';
import { AddExpensesForm, AddIncomeForm, BankWalletPage, BudgetsPage, DashboardPage, FixedExpensesPage, IncomePage, LoansPage, TaxPage, TransactionsPage } from './pages';

type Fixtures = {
  user: FreshUser & { token: string };
  api: Api;
  addExpenses: AddExpensesForm;
  addIncome: AddIncomeForm;
  bankWallet: BankWalletPage;
  dashboard: DashboardPage;
  taxPage: TaxPage;
  transactions: TransactionsPage;
  loans: LoansPage;
  fixedExpenses: FixedExpensesPage;
  budgetsPage: BudgetsPage;
  incomePage: IncomePage;
};

export const test = base.extend<Fixtures>({
  user: async ({ page }, use) => {
    const u = await createFreshUser();
    try {
      const resp = await page.request.post('/api/v1/auth/login', { data: { email: u.email, password: u.password } });
      expect(resp.ok(), `login as fresh user failed: ${resp.status()}`).toBeTruthy();
      const { accessToken } = await resp.json();
      await use({ ...u, token: accessToken });
    } finally {
      await deleteUser(u.id);
    }
  },
  api: async ({ page, user }, use) => use(new Api(page.request, user.token)),
  addExpenses: async ({ page }, use) => use(new AddExpensesForm(page)),
  addIncome: async ({ page }, use) => use(new AddIncomeForm(page)),
  bankWallet: async ({ page }, use) => use(new BankWalletPage(page)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  taxPage: async ({ page }, use) => use(new TaxPage(page)),
  transactions: async ({ page }, use) => use(new TransactionsPage(page)),
  loans: async ({ page }, use) => use(new LoansPage(page)),
  fixedExpenses: async ({ page }, use) => use(new FixedExpensesPage(page)),
  budgetsPage: async ({ page }, use) => use(new BudgetsPage(page)),
  incomePage: async ({ page }, use) => use(new IncomePage(page)),
});

export { expect };
