import { RPCImpl } from 'protobufjs';
import http from 'http';

interface CreateTwirpRPCImplParams {
  host: string;
  port: number;
  path: string;
}

export function createProtobufRPCImpl(params: CreateTwirpRPCImplParams): RPCImpl {
  const rpcImpl: RPCImpl = (method, requestData, callback) => {
    const chunks: Buffer[] = [];
    const req = http.request({
      hostname: params.host,
      port: params.port,
      path: params.path + method.name,
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

interface JSONReadyObject {
  toJSON: () => {[key: string]: any};
}

export type JSONRPCImpl = (obj: JSONReadyObject, methodName: string) => Promise<{}>;

export function createJSONRPCImpl(params: CreateTwirpRPCImplParams): JSONRPCImpl {
  return function doJSONRequest(obj: JSONReadyObject, methodName: string): Promise<{}> {
    const json = JSON.stringify(obj.toJSON());

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const req = http.request({
        hostname: params.host,
        port: params.port,
        path: params.path + methodName,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': json.length,
        },
      }, (res) => {
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks);
          if (res.statusCode != 200) {
            reject(getTwirpError(data));
          } else {
            resolve(JSON.parse(data.toString()));
          }
        });
        res.on('error', (err) => {
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });

      req.end(json);
    })
  }
}

function getTwirpError(data: Uint8Array): Error {
  const json = JSON.parse(data.toString());
  const error = new Error(json.msg)
  error.name = json.code;

  return error;
}
