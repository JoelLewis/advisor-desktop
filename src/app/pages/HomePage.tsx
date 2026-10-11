import { Link } from 'react-router-dom'
import { Page } from '@/kit/page/Page'

export function HomePage() {
  return (
    <Page title="Advisor Desktop" eyebrow="Workspace">
      <p className="max-w-[65ch] text-body text-ink-2">
        The threads-first workspace is under construction. The component kit shows the design system on live demo data.
      </p>
      <Link to="/kit" className="mt-4 inline-block text-body underline underline-offset-4">Open the component kit</Link>
    </Page>
  )
}
