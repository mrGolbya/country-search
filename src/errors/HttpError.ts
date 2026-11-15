export class HttpError extends Error {
  constructor(
    readonly status: number,
    message = `HTTP error: ${status}`
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
