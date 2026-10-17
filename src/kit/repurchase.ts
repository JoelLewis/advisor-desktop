import { fmtDayMonthYear } from './measure'

/** The one way the app says a wash-sale window, wherever it says it: through the window's last day. */
export const dontRepurchaseThrough = (lastWashDay: string): string => `Don't repurchase through ${fmtDayMonthYear(lastWashDay)}`
