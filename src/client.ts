import { RPCImpl } from 'protobufjs';
import * as http from 'http';

interface CreateTwirpClientParams {
  host: string;
  port: number;
  service: protobuf.Service;
}

export function createTwirpClient<S>(params: CreateTwirpClientParams) {
  const impl = twirpRPCImpl({
    host: params.host,
    port: params.port,
    path: `/twirp/${params.service.fullName.substring(1)}`,
  });
  return params.service.create(impl, false, false) as unknown as S;
}

interface TwirpRCPImplParams {
  host: string;
  port: number;
  path: string;
}

function twirpRPCImpl(params: TwirpRCPImplParams): RPCImpl {
  const rpcImpl: RPCImpl = (method, requestData, callback) => {
    const chunks: Buffer[] = [];
    const req = http.request({
      hostname: params.host,
      port: params.port,
      path: `${params.path}/${method.name}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/protobuf',
        'Content-Length': Buffer.byteLength(requestData),
      },
    }, (res) => {
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        if (res.statusCode != 200) {
          callback(getTwirpError(data), null);
        } else {
          callback(null, data);
        }
      });
      res.on('error', (err) => {
        callback(err, null);
      });
    }).on('error', (err) => {
      callback(err, null);
    });

    req.end(requestData);
  }

  return rpcImpl;
}

function getTwirpError(data: Uint8Array): Error {
  const json = JSON.parse(data.toString());
  const error = new Error(json.msg)
  error.name = json.code;

  return error;
}
