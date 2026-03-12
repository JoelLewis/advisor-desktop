/* eslint-disable react-refresh/only-export-components -- shared utility components + constants */
import { Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NBACategory } from '@/types/nba'
import type { CommunicationChannel, FollowUpCadence } from '@/types/settings'

export const SAVE_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md bg-accent-blue px-3 py-1.5 text-caption font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50'

export const NBA_CATEGORIES: { value: NBACategory; label: string }[] = [
  { value: 'rebalancing', label: 'Rebalancing' },
  { value: 'tax_management', label: 'Tax Management' },
  { value: 'planning', label: 'Planning' },
  { value: 'risk', label: 'Risk' },
  { value: 'client_service', label: 'Client Service' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'growth', label: 'Growth' },
]

export const COMMUNICATION_CHANNELS: { value: CommunicationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'in_person', label: 'In-Person' },
]

export const FOLLOW_UP_CADENCES: { value: FollowUpCadence; label: string }[] = [
  { value: '1_day', label: '1 Day' },
  { value: '3_days', label: '3 Days' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export const PROPOSAL_TEMPLATES = [
  { value: 'comprehensive-wealth', label: 'Comprehensive Wealth Management' },
  { value: 'retirement-transition', label: 'Retirement Transition' },
  { value: 'growth-portfolio', label: 'Growth Portfolio' },
]

export const PROPOSAL_SECTIONS = [
  { value: 'cover', label: 'Cover Page' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'current_situation', label: 'Current Situation' },
  { value: 'recommended_portfolio', label: 'Recommended Portfolio' },
  { value: 'fee_schedule', label: 'Fee Schedule' },
  { value: 'disclosures', label: 'Disclosures' },
]

export function SaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={SAVE_BUTTON_CLASS}>
      <Save className="h-3.5 w-3.5" /> Save
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-accent-blue' : 'bg-border-secondary',
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )} />
      </button>
    </label>
  )
}

export function SelectField({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function SliderField({ value, onChange, label, min = 0, max = 100 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-body text-text-primary">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-border-secondary accent-accent-blue"
        />
        <span className="w-8 font-mono text-caption text-text-secondary text-right">{value}</span>
      </div>
    </div>
  )
}
