import { HttpError } from '../errors/HttpError';

export type SearchErrorType = 'aborted' | 'timeout' | 'http' | 'network';

function getErrorName(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string'
  ) {
    return error.name;
  }

  return undefined;
}

export function classifySearchError(error: unknown): SearchErrorType {
  if (error instanceof HttpError) {
    return 'http';
  }

  const errorName = getErrorName(error);
  if (errorName === 'AbortError') {
    return 'aborted';
  }
  if (errorName === 'TimeoutError') {
    return 'timeout';
  }

  return 'network';
}
