import http from 'http';
import * as errors from './errors';

export enum TwirpContentType {
  Protobuf,
  JSON,
  Unknown,
}

type Router<T> = (
  url: string | undefined,
  contentType: TwirpContentType,
) => undefined | TwirpHandler<T>;
export type TwirpHandler<T> = (data: Buffer, rpcHandlers: T) => Promise<Uint8Array | string>;

function getContentType(mimeType: string | undefined): TwirpContentType {
  switch (mimeType) {
    case 'application/protobuf':
      return TwirpContentType.Protobuf;
    case 'application/json':
      return TwirpContentType.JSON;
    default:
      return TwirpContentType.Unknown;
  }
}

export async function handleRequest<T>(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  getTwirpHandler: Router<T>,
  rpcHandlers: T,
): Promise<void> {
  if (req.method !== 'POST') {
    writeError(
      res,
      new errors.BadRouteError(`unsupported method ${req.method} (only POST is allowed)`),
    );
    return;
  }

  const contentTypeMimeType = req.headers['content-type'];
  if (!contentTypeMimeType) {
    writeError(res, new errors.BadRouteError(`missing Content-Type header`));
    return;
  }

  const contentType = getContentType(contentTypeMimeType);
  if (contentType === TwirpContentType.Unknown) {
    writeError(res, new errors.BadRouteError(`unexpected Content-Type: ${contentTypeMimeType}`));
    return;
  }

  const handler = getTwirpHandler(req.url, contentType);
  if (!handler) {
    writeError(res, new errors.BadRouteError(`no handler for path ${req.url}`));
    return;
  }

  let requestData;
  try {
    requestData = await getRequestData(req);
  } catch (e) {
    writeError(res, e);
    return;
  }

  let responseData;
  try {
    responseData = await handler(requestData, rpcHandlers);
  } catch (e) {
    writeError(res, e);
    return;
  }

  res.setHeader('Content-Type', contentType);
  res.end(responseData);
}

export function getRequestData(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const data = Buffer.concat(chunks);
      resolve(data);
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

export function writeError(res: http.ServerResponse, error: Error | errors.TwirpError): void {
  res.setHeader('Content-Type', 'application/json');

  let twirpError: errors.TwirpError;
  if ('isTwirpError' in error) {
    twirpError = error;
  } else {
    twirpError = new errors.InternalServerError(error.message);
  }

  res.statusCode = twirpError.statusCode;
  res.end(
    JSON.stringify({
      code: twirpError.name,
      msg: twirpError.message,
    }),
  );
}
