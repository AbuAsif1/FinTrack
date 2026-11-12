// SUGGESTED_FIXED_EXPENSES — the seven defaults from BRD §5 FR-05
// Category names are matched case-insensitively against the user's categories at seeding time.
// YouTube Premium → Entertainment; DPS items → DPS / Savings; Mess Rent → Rent;
// Home Internet and Home Electricity → Utility.

export interface SuggestedFixedExpense {
  name: string;
  standard_amount_paisa: number;
  due_day: number;
  category_name: string; // human-readable, used at first-use seeding
  routing_type_hint: string; // 'NONE' or 'SAVINGS_DEPOSIT'
}

export const SUGGESTED_FIXED_EXPENSES: SuggestedFixedExpense[] = [
  { name: 'YouTube Premium',   standard_amount_paisa: 16000,   due_day: 1,  category_name: 'Entertainment', routing_type_hint: 'NONE' },
  { name: 'Upension DPS',      standard_amount_paisa: 1000000, due_day: 8,  category_name: 'DPS / Savings',  routing_type_hint: 'SAVINGS_DEPOSIT' },
  { name: 'DPS 10k City Bank', standard_amount_paisa: 1000000, due_day: 14, category_name: 'DPS / Savings',  routing_type_hint: 'SAVINGS_DEPOSIT' },
  { name: 'DPS 30k City Bank', standard_amount_paisa: 3000000, due_day: 14, category_name: 'DPS / Savings',  routing_type_hint: 'SAVINGS_DEPOSIT' },
  { name: 'Mess Rent',         standard_amount_paisa: 872200,  due_day: 15, category_name: 'Rent',           routing_type_hint: 'NONE' },
  { name: 'Home Internet',     standard_amount_paisa: 50000,   due_day: 16, category_name: 'Utility',        routing_type_hint: 'NONE' },
  { name: 'Home Electricity',  standard_amount_paisa: 135000,  due_day: 27, category_name: 'Utility',        routing_type_hint: 'NONE' },
];

// AC-FIXED-1: total = 16000 + 1000000 + 1000000 + 3000000 + 872200 + 50000 + 135000 = 6073200 paisa = ৳60,732.00
export const SUGGESTED_TOTAL_PAISA = SUGGESTED_FIXED_EXPENSES.reduce((sum, e) => sum + e.standard_amount_paisa, 0);
