import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { workingOrderWords } from '@/kit/working-order-words'
import { WorkingOrdersNote } from '@/workspace/proposal/WorkingOrdersNote'

describe('WorkingOrdersNote', () => {
  it('says which working orders the version counted, with quantity and limit', () => {
    render(<WorkingOrdersNote orders={[{ orderId: 'ord-005', symbol: 'QQQ', name: 'Invesco QQQ Trust', side: 'buy', quantity: 200, estimatedValue: 96_000, limitPrice: 480 }]} />)
    expect(screen.getByText('Counts the working order already open in this account as filled: buy 200 QQQ, limit 480.00.')).toBeInTheDocument()
  })
  it('says nothing when none was counted', () => {
    const { container } = render(<WorkingOrdersNote orders={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('words a working order with its unit when one is given', () => {
    expect(workingOrderWords({ side: 'buy', quantity: 5, symbol: 'AAPLC185', limitPrice: 8.5 }, 'contracts')).toBe('buy 5 contracts AAPLC185, limit 8.50')
    expect(workingOrderWords({ side: 'sell', quantity: 10, symbol: 'SPY' })).toBe('sell 10 SPY')
  })
})
