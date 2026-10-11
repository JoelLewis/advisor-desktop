type AttestationProps = { id: string; checked: boolean; onChange: (checked: boolean) => void; children: string; disabled?: boolean }

export function Attestation({ id, checked, onChange, children, disabled }: AttestationProps) {
  return (
    <div className="flex items-start gap-3 border-b border-rule py-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 appearance-none border border-ink-2 bg-face accent-ink checked:bg-ink checked:inset-ring-3 checked:inset-ring-face"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-body text-ink">{children}</label>
    </div>
  )
}
