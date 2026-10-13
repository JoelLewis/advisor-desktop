import type { RiskAnswer } from '@/types/onboarding'
import type { Statement } from '@/types/workspace-prospect'

/**
 * Her answers to the questionnaire Adrian hands her at coffee (option indexes into `riskQuestions`):
 * more than twenty years; hold and wait; long-term growth; over $500,000; moderate experience; 25–50%
 * of net worth; liquidity moderately important; moderate fluctuations — 95, 55, 80, 90, 50, 50, 55, 55,
 * averaging 66 (Moderate Aggressive → Growth).
 */
export const PELL_ANSWERS: readonly RiskAnswer[] = [
  { questionId: 'rq-01', selectedOption: 4 }, { questionId: 'rq-02', selectedOption: 2 }, { questionId: 'rq-03', selectedOption: 3 },
  { questionId: 'rq-04', selectedOption: 4 }, { questionId: 'rq-05', selectedOption: 2 }, { questionId: 'rq-06', selectedOption: 2 },
  { questionId: 'rq-07', selectedOption: 2 }, { questionId: 'rq-08', selectedOption: 2 },
]

/**
 * The two month-end statements she shares. Quantities, basis and acquisition dates are hers; the engine
 * values them at the 25 Feb close. The 403(b)'s basis is what the plan reports and is never taxed here.
 */
export const PELL_STATEMENTS: readonly Statement[] = [
  { id: 'stmt-pell-1', custodian: 'Fidelity', accountType: 'taxable_brokerage', asOf: '2026-01-31', cash: 100_782, holdings: [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', quantity: 2_800, costBasis: 1_010_000, acquired: '2020-11-30', assetClass: 'us_equity' },
    { symbol: 'SYK', name: 'Stryker Corp.', quantity: 1_390, costBasis: 61_000, acquired: '2009-08-17', assetClass: 'us_equity' },
  ] },
  { id: 'stmt-pell-2', custodian: 'TIAA', accountType: '403b', asOf: '2026-01-31', cash: 8_400, holdings: [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 2_000, costBasis: 410_000, acquired: '2021-01-15', assetClass: 'us_equity' },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', quantity: 3_600, costBasis: 360_000, acquired: '2009-06-15', assetClass: 'fixed_income' },
  ] },
]

export const PELL_INTRO = 'James Thompson suggested I get in touch. Looking forward to coffee this afternoon.'
export const PELL_REPLY = 'Thank you for the coffee. Here are my answers to the questionnaire and my two statements.'
export const PELL_ACCEPTANCE = "I've read the proposal and I'd like to go ahead."

/** Thu 26 Feb 09:10 ET and Mon 2 Mar 10:00 ET: when her scripted reply and acceptance arrive. */
export const REPLY_AT = '2026-02-26T14:10:00.000Z'
export const ACCEPTANCE_AT = '2026-03-02T15:00:00.000Z'
