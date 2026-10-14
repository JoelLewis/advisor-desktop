import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <a href="/">The workspace</a>
    </main>
  )
}
