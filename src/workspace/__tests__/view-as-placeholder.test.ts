import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PEOPLE } from '@/mocks/data/people'
import { personWithRole } from '@/lib/role-label'
import { WIDEST_OPTION } from '@/workspace/shell/view-as-words'

it("holds the View as placeholder to the directory's longest label, and the static first frame to the same", () => {
  const labels = PEOPLE.map(personWithRole)
  const longest = Math.max(...labels.map((l) => l.length))
  expect(labels).toContain(WIDEST_OPTION)
  expect(WIDEST_OPTION.length).toBe(longest)
  expect(readFileSync('index.html', 'utf8')).toContain(`>${WIDEST_OPTION}</span>`)
})
