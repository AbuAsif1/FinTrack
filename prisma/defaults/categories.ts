import { RoutingType } from '@prisma/client';

export const starterCategories: { name: string; routingType: RoutingType; colorHex: string }[] = [
  { name: 'Groceries', routingType: RoutingType.NONE, colorHex: '#10B981' },
  { name: 'Dining', routingType: RoutingType.NONE, colorHex: '#F59E0B' },
  { name: 'Transport', routingType: RoutingType.NONE, colorHex: '#3B82F6' },
  { name: 'Utility', routingType: RoutingType.NONE, colorHex: '#6366F1' },
  { name: 'Rent', routingType: RoutingType.NONE, colorHex: '#EC4899' },
  { name: 'Entertainment', routingType: RoutingType.NONE, colorHex: '#8B5CF6' },
  { name: 'Health', routingType: RoutingType.NONE, colorHex: '#EF4444' },
  { name: 'Shopping', routingType: RoutingType.NONE, colorHex: '#F97316' },
  { name: 'Other', routingType: RoutingType.NONE, colorHex: '#6B7280' },
  { name: 'DPS / Savings', routingType: RoutingType.SAVINGS_DEPOSIT, colorHex: '#14B8A6' },
  { name: 'Investment (Sanchaypatra)', routingType: RoutingType.SAVINGS_DEPOSIT, colorHex: '#0EA5E9' },
  { name: 'Savings Withdrawal', routingType: RoutingType.SAVINGS_WITHDRAWAL, colorHex: '#22C55E' },
  { name: 'Savings Interest', routingType: RoutingType.SAVINGS_INTEREST, colorHex: '#84CC16' },
  { name: 'Loan Given', routingType: RoutingType.LOAN_GIVEN, colorHex: '#F43F5E' },
  { name: 'Loan Received', routingType: RoutingType.LOAN_RECEIVED, colorHex: '#06B6D4' },
  { name: 'Tax Payment', routingType: RoutingType.TAX_PAYMENT, colorHex: '#B45309' },
];
