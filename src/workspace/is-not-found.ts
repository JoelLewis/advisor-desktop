import { ApiClientError } from '@/services/api-client'

/** The engine answers 404 both for what does not exist and for what this viewer may not see. */
export const isNotFound = (error: Error) => error instanceof ApiClientError && error.status === 404
