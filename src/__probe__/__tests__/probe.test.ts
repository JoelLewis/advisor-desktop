import { it } from 'vitest'
import { bookRiskView } from '@/mocks/reference/risk'
it('probe', () => {
  const v = bookRiskView('user-001')!
  console.log(v.rows.map((r) => `ROW ${r.accountId} ${r.mandateName} s=${r.posture.score} q=${r.posture.tolerance.score} ${r.posture.status} beyond=${r.posture.beyond} head=${r.posture.headroom} key=${r.posture.sortKey}`).join('\n'))
  console.log('ROW counts', v.aboveTolerance, v.belowTolerance)
})
