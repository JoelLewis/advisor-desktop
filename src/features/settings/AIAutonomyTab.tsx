import { StandingRulesCard } from './autonomy/StandingRulesCard'
import { DelegationRulesCard } from './autonomy/DelegationRulesCard'

export function AIAutonomyTab() {
  return (
    <div className="space-y-6" data-annotation="settings-automation">
      <StandingRulesCard />
      <DelegationRulesCard />
    </div>
  )
}
