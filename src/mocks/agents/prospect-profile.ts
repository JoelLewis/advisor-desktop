import type { AgentContext, AgentFinding } from './agent'
import { prospectOf } from '@/mocks/workspace/prospects'
import { profileOf } from '@/mocks/workspace/risk-scoring'
import { modelMix } from '@/mocks/workspace/prospect-model'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/** Scores her questionnaire and maps it to the firm's model through the one table, showing the working. Contacts nobody; recommends no account. */
export function runProspectProfile({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'prospect') throw new Error(`Prospect Profile works on a prospect, not a ${subject.type}`)
  const record = prospectOf(subject.id)
  if (!record) throw new Error(`Prospect Profile: no prospect ${subject.id}`)
  const profile = profileOf(record)
  if (!profile || !record.questionnaire) {
    return [{ claim: 'No questionnaire is on file yet; there is nothing to score.', attention: 'info', figures: [], citations: [{ source: 'Prospect record', asOf }] }]
  }
  const band = profile.profileLabel.toLowerCase()
  const mix = modelMix(profile.modelId)
  return [
    {
      claim: `${record.name}'s answers average to a score in the ${band} band.`, attention: 'info',
      figures: [
        { label: 'Score', value: profile.score, unit: 'pts', source: 'questionnaire.average' },
        { label: 'Band from', value: profile.floor, unit: 'pts', source: 'riskProfileTable.floor' },
        { label: 'Band to', value: profile.ceiling, unit: 'pts', source: 'riskProfileTable.ceiling' },
      ],
      citations: [{ source: `Risk questionnaire · answered by ${record.name}`, asOf: record.questionnaire.receivedAt }],
    },
    {
      claim: `The firm's risk-profile table maps the ${band} band to ${profile.modelName}, whose weights are below.`, attention: 'info',
      figures: [
        { label: 'Stocks', value: mix.stocks, unit: '%', source: 'model.targetWeight' },
        { label: 'Bonds', value: mix.bonds, unit: '%', source: 'model.targetWeight' },
        { label: 'Alternatives and commodities', value: mix.other, unit: '%', source: 'model.targetWeight' },
        { label: 'Cash', value: mix.cash, unit: '%', source: 'model.targetWeight' },
      ],
      citations: [{ source: 'Risk profile table · firm policy', asOf: MOCK_TODAY_ISO }, { source: `Model · ${profile.modelName}`, asOf: MOCK_TODAY_ISO }],
    },
  ]
}
