import type { ReferenceView, RowQuote } from '@/types/reference'
import { attributionQuote } from './attribution'
import { billingQuote } from './billing'
import { blotterQuote } from './blotter'
import { modelQuote } from './models'
import { practiceQuote } from './practice'
import { reconciliationQuote } from './reconciliation'
import { riskQuote } from './risk'

/** A row of a view, quoted by the engine from the view and the row id alone. */
export function rowQuote(view: ReferenceView, rowId: string): RowQuote | undefined {
  switch (view) {
    case 'billing': return billingQuote(rowId)
    case 'practice': return practiceQuote(rowId)
    case 'reconciliation': return reconciliationQuote(rowId)
    case 'risk': return riskQuote(rowId)
    case 'attribution': return attributionQuote(rowId)
    case 'models': return modelQuote(rowId)
    case 'blotter': return blotterQuote(rowId)
  }
}
