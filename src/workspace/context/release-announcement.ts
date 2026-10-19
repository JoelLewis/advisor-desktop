import { fmtQuantity } from '@/kit/measure'

export const releaseAnnouncement = (releasedBy: string, fillCount: number) =>
  `Released by ${releasedBy}; ${fmtQuantity(fillCount)} ${fillCount === 1 ? 'order' : 'orders'} filled`
