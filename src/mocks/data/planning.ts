import type { FinancialPlan } from '@/types/planning'

export const plans: FinancialPlan[] = [
  {
    id: 'plan-001', clientId: 'cli-001', householdId: 'hh-001',
    aggregateProbability: 0.87, lastUpdated: '2025-11-15', nextReviewDate: '2026-03-01',
    goals: [
      { id: 'goal-001', name: 'Retirement Income', type: 'retirement', targetAmount: 15_000_000, currentFunding: 14_200_000, targetDate: '2023-03-22', probability: 0.92, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-002', name: 'Legacy / Estate', type: 'legacy', targetAmount: 10_000_000, currentFunding: 8_500_000, targetDate: '2040-01-01', probability: 0.78, status: 'at_risk', shortfallDrivers: ['inflation', 'longevity'] },
    ],
  },
  {
    id: 'plan-002', clientId: 'cli-003', householdId: 'hh-002',
    aggregateProbability: 0.91, lastUpdated: '2025-12-01', nextReviewDate: '2026-03-15',
    goals: [
      { id: 'goal-003', name: 'Retirement Income', type: 'retirement', targetAmount: 20_000_000, currentFunding: 19_500_000, targetDate: '2030-11-03', probability: 0.94, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-004', name: 'Philanthropy Fund', type: 'legacy', targetAmount: 5_000_000, currentFunding: 4_200_000, targetDate: '2035-01-01', probability: 0.85, status: 'on_track', shortfallDrivers: [] },
    ],
  },
  {
    id: 'plan-003', clientId: 'cli-004', householdId: 'hh-003',
    aggregateProbability: 0.82, lastUpdated: '2025-10-01', nextReviewDate: '2026-04-01',
    goals: [
      { id: 'goal-005', name: 'Retirement Income', type: 'retirement', targetAmount: 6_000_000, currentFunding: 4_800_000, targetDate: '2035-05-18', probability: 0.84, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-006', name: 'College — Emma (Age 14)', type: 'education', targetAmount: 320_000, currentFunding: 210_000, targetDate: '2030-09-01', probability: 0.88, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-007', name: 'College — Jake (Age 11)', type: 'education', targetAmount: 380_000, currentFunding: 165_000, targetDate: '2033-09-01', probability: 0.76, status: 'at_risk', shortfallDrivers: ['savings rate', 'market returns'] },
    ],
  },
  {
    id: 'plan-004', clientId: 'cli-006', householdId: 'hh-004',
    aggregateProbability: 0.89, lastUpdated: '2025-11-05', nextReviewDate: '2026-05-01',
    goals: [
      { id: 'goal-008', name: 'Retirement Income', type: 'retirement', targetAmount: 8_000_000, currentFunding: 7_100_000, targetDate: '2033-12-07', probability: 0.90, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-009', name: 'Beach House Purchase', type: 'purchase', targetAmount: 2_500_000, currentFunding: 1_800_000, targetDate: '2028-06-01', probability: 0.82, status: 'on_track', shortfallDrivers: [] },
    ],
  },
  {
    id: 'plan-005', clientId: 'cli-008', householdId: 'hh-005',
    aggregateProbability: 0.93, lastUpdated: '2025-10-10', nextReviewDate: '2026-02-26',
    goals: [
      { id: 'goal-010', name: 'Retirement Income', type: 'retirement', targetAmount: 3_500_000, currentFunding: 3_900_000, targetDate: '2024-08-30', probability: 0.96, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-011', name: 'Medical Practice Endowment', type: 'legacy', targetAmount: 1_000_000, currentFunding: 750_000, targetDate: '2035-01-01', probability: 0.88, status: 'on_track', shortfallDrivers: [] },
    ],
  },
  {
    id: 'plan-006', clientId: 'cli-011', householdId: 'hh-007',
    aggregateProbability: 0.79, lastUpdated: '2025-12-02', nextReviewDate: '2026-03-20',
    goals: [
      { id: 'goal-012', name: 'Retirement Income', type: 'retirement', targetAmount: 5_000_000, currentFunding: 3_400_000, targetDate: '2040-03-12', probability: 0.83, status: 'on_track', shortfallDrivers: [] },
      { id: 'goal-013', name: 'College — Arjun (Age 6)', type: 'education', targetAmount: 350_000, currentFunding: 120_000, targetDate: '2038-09-01', probability: 0.74, status: 'at_risk', shortfallDrivers: ['savings rate', 'market returns'] },
      { id: 'goal-014', name: 'College — New Baby', type: 'education', targetAmount: 400_000, currentFunding: 0, targetDate: '2044-09-01', probability: 0.0, status: 'not_analyzed', shortfallDrivers: [] },
    ],
  },
  {
    id: 'plan-007', clientId: 'cli-016', householdId: 'hh-010',
    aggregateProbability: 0.71, lastUpdated: '2025-10-15', nextReviewDate: '2026-04-15',
    goals: [
      { id: 'goal-015', name: 'Retirement Income', type: 'retirement', targetAmount: 800_000, currentFunding: 720_000, targetDate: '2025-10-08', probability: 0.71, status: 'at_risk', shortfallDrivers: ['longevity', 'healthcare costs', 'asset allocation'] },
    ],
  },
]
