import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getBilling, getPractice } from '@/services/reference'
import { fmtBasisPoints, fmtMoney } from '@/kit/measure'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the Billing view', () => {
  afterEach(() => sessionStorage.clear())

  it("reads today's fees, every household on the schedule, the tier breakdown, the runs and the exceptions", async () => {
    const engine = await getBilling('user-001')
    renderRoutes(routes, '/billing?household=hh-001&from=th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.totals.annualFee))
    expect(main).toHaveTextContent('Comprehensive Wealth Management schedule')
    expect(screen.getByRole('table', { name: 'Fee schedule' })).toHaveTextContent('0.85')
    const households = screen.getByRole('table', { name: 'Households' })
    expect(within(households).getByRole('row', { name: /Garcia Household/ })).toHaveTextContent('In arrears')
    const tiers = screen.getByRole('table', { name: 'Tier breakdown · Johnson Household' })
    expect(tiers).toHaveTextContent('8,750,000')
    expect(tiers).toHaveTextContent('124,250')
    expect(screen.getByRole('table', { name: 'Billing runs' })).toHaveTextContent('Q1 2026')
    expect(screen.getByRole('table', { name: 'Run of 2026-01-02' })).toHaveTextContent('Q4 2025')
    expect(screen.getByRole('list', { name: 'Billing exceptions' })).toHaveTextContent('agreement bills in arrears')
    const methods = screen.getByRole('region', { name: 'Methods & sources' })
    expect(methods).toHaveTextContent('Quarter-end valuesMODELED')
  })

  it('picks another household for the tier breakdown', async () => {
    renderRoutes(routes, '/billing')
    await screen.findByRole('heading', { level: 1, name: 'Billing' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Household' }), 'Kim-Lee Household')
    expect(await screen.findByRole('table', { name: 'Tier breakdown · Kim-Lee Household' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Next tier at 2,000,000 USD: 0.85% on the slice above it.')
  })

  it('takes a household to its team thread', async () => {
    renderRoutes(routes, '/billing')
    await screen.findByRole('heading', { level: 1, name: 'Billing' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Johnson Household to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Johnson annual review' })).toHaveAttribute('href', '/t/th-johnson-meeting')
  })

  it('is not found for Robert', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/billing')
    expect(await screen.findByRole('heading', { level: 1, name: 'Billing not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Comprehensive Wealth Management')
  })

  it('is one step from the household view', async () => {
    renderRoutes(routes, '/households/hh-001?from=th-johnson-meeting')
    expect(await screen.findByRole('link', { name: 'Billing for this household' })).toHaveAttribute('href', '/billing?household=hh-001&from=th-johnson-meeting')
  })
})

describe('the Practice view', () => {
  afterEach(() => sessionStorage.clear())

  it('reads revenue from billing, the book from the accounts, and households by value', async () => {
    const engine = await getPractice('user-001')
    renderRoutes(routes, '/practice')
    expect(await screen.findByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent(fmtMoney(engine.revenue.annual))
    expect(main).toHaveTextContent(`${fmtBasisPoints(engine.revenue.effectiveRate)}bps`)
    expect(main).toHaveTextContent('1,828')
    const rows = within(screen.getByRole('table', { name: 'Households by value' })).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Chen-Wong Household')
    expect(screen.getByRole('table', { name: 'By segment' })).toHaveTextContent('Platinum')
    expect(screen.getByRole('table', { name: 'Tenure' })).toHaveTextContent('5 to 10 years')
    expect(screen.getByRole('region', { name: 'Methods & sources' })).toHaveTextContent('Latest runMODELED')
    expect(main).not.toHaveTextContent(/Lisa Park|waterfall|capacity|growth trend/i)
  })

  it('takes a household to a new team thread', async () => {
    renderRoutes(routes, '/practice')
    await screen.findByRole('heading', { level: 1, name: 'Practice' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Take Chen-Wong Household to a team thread' }))
    expect(await screen.findByRole('link', { name: 'In Practice · Chen-Wong Household' })).toBeInTheDocument()
  })

  it('is not found for Dr. Pell', async () => {
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/practice')
    expect(await screen.findByRole('heading', { level: 1, name: 'Practice not found' })).toBeInTheDocument()
  })
})
