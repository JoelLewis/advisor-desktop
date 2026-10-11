/**
 * Lot-selection standing instructions under specific identification (C14). Spec ID itself is not a
 * fifth algorithm; HIFO and LIFO are instructions under it, which is how custodians offer it.
 */
export const COST_BASIS_METHODS = ['FIFO', 'LIFO', 'HIFO', 'AvgCost'] as const
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number]
