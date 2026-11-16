interface InFlightRequest<T> {
  controller: AbortController;
  promise: Promise<T>;
  subscribers: number;
}

interface CachedResponse<T> {
  value: T;
}

function createAbortError(): DOMException {
  return new DOMException('The request was aborted', 'AbortError');
}

function waitForCaller<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  onSettled?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? createAbortError());
      return;
    }

    let settled = false;
    const cleanup = () => {
      signal.removeEventListener('abort', handleAbort);
      onSettled?.();
    };
    const handleAbort = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(signal.reason ?? createAbortError());
    };

    signal.addEventListener('abort', handleAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}

export class AsyncRequestCache<T> {
  private readonly responses = new Map<string, CachedResponse<T>>();
  private readonly inFlight = new Map<string, InFlightRequest<T>>();

  constructor(
    private readonly loader: (query: string, signal: AbortSignal) => Promise<T>,
  ) {}

  get(query: string, signal: AbortSignal): Promise<T> {
    const key = query.trim().toLowerCase();
    if (signal.aborted) {
      return Promise.reject(signal.reason ?? createAbortError());
    }

    const cachedResponse = this.responses.get(key);
    if (cachedResponse) {
      return waitForCaller(Promise.resolve(cachedResponse.value), signal);
    }

    let request = this.inFlight.get(key);
    if (request?.controller.signal.aborted) {
      this.inFlight.delete(key);
      request = undefined;
    }

    if (!request) {
      const controller = new AbortController();
      const newRequest: InFlightRequest<T> = {
        controller,
        subscribers: 0,
        promise: Promise.resolve()
          .then(() => this.loader(query, controller.signal))
          .then((response) => {
            if (controller.signal.aborted) {
              throw controller.signal.reason ?? createAbortError();
            }

            this.responses.set(key, { value: response });
            return response;
          })
          .finally(() => {
            if (this.inFlight.get(key) === newRequest) {
              this.inFlight.delete(key);
            }
          }),
      };
      this.inFlight.set(key, newRequest);
      request = newRequest;
    }

    request.subscribers += 1;
    const activeRequest = request;

    return waitForCaller(activeRequest.promise, signal, () => {
      activeRequest.subscribers -= 1;
      if (
        activeRequest.subscribers === 0 &&
        this.inFlight.get(key) === activeRequest
      ) {
        activeRequest.controller.abort();
      }
    });
  }
}
