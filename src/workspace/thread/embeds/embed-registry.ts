import type { ComponentType } from 'react'
import type { EmbedKind } from '@/types/workspace'
import type { EmbedProps } from './embed-props'
import { DriftEmbed } from './DriftEmbed'
import { RebalanceEmbed } from './RebalanceEmbed'

const BY_KIND: Readonly<Record<EmbedKind, ComponentType<EmbedProps>>> = {
  drift: DriftEmbed,
  rebalance_preview: RebalanceEmbed,
}

const EMBEDS: ReadonlyMap<string, ComponentType<EmbedProps>> = new Map(Object.entries(BY_KIND))

/** The component that renders an embed kind. A kind with no component is an error, never a blank. */
export function embedFor(kind: string): ComponentType<EmbedProps> {
  const component = EMBEDS.get(kind)
  if (!component) throw new Error(`No embed component for "${kind}"`)
  return component
}
