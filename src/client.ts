import { RPCImpl, util } from 'protobufjs';
import http from 'http';

interface CreateTwirpRPCImplParams {
  host: string;
  port: number;
  path: string;
}

export function createProtobufRPCImpl(params: CreateTwirpRPCImplParams): RPCImpl {
  const rpcImpl: RPCImpl = (method, requestData, callback) => {
    const chunks: Buffer[] = [];
    const req = http
      .request(
        {
          hostname: params.host,
          port: params.port,
          path: params.path + method.name,
          method: 'POST',
          headers: {
            'Content-Type': 'application/protobuf',
            'Content-Length': Buffer.byteLength(requestData),
          },
        },
        res => {
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const data = Buffer.concat(chunks);
            if (res.statusCode != 200) {
              callback(getTwirpError(data), null);
            } else {
              callback(null, data);
            }
          });
          res.on('error', err => {
            callback(err, null);
          });
        },
      )
      .on('error', err => {
        callback(err, null);
      });

    req.end(requestData);
  };

  return rpcImpl;
}

interface JSONReadyObject {
  toJSON: () => { [key: string]: unknown };
}

export type JSONRPCImpl = (obj: JSONReadyObject, methodName: string) => Promise<{}>;

export function createJSONRPCImpl(params: CreateTwirpRPCImplParams): JSONRPCImpl {
  return function doJSONRequest(obj: JSONReadyObject, methodName: string): Promise<{}> {
    const json = JSON.stringify(obj);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const req = http
        .request(
          {
            hostname: params.host,
            port: params.port,
            path: params.path + methodName,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': json.length,
            },
          },
          res => {
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
              const data = Buffer.concat(chunks);
              if (res.statusCode != 200) {
                reject(getTwirpError(data));
              } else {
                resolve(jsonToMessageProperties(data));
              }
            });
            res.on('error', err => {
              reject(err);
            });
          },
        )
        .on('error', err => {
          reject(err);
        });

      req.end(json);
    });
  };
}

function getTwirpError(data: Uint8Array): Error {
  const json = JSON.parse(data.toString());
  const error = new Error(json.msg);
  error.name = json.code;

  return error;
}

export function jsonToMessageProperties(buffer: Buffer): JSONObject {
  const json = buffer.toString();
  const obj = JSON.parse(json);

  return camelCaseKeys(obj);
}

function camelCaseKeys(obj: JSONObject): JSONObject {
  let newObj: JSONObject;
  if (Array.isArray(obj)) {
    return obj.map(value => {
      if (isJSONObject(value)) {
        value = camelCaseKeys(value);
      }
      return value;
    });
  } else {
    newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      let camelizedValue = value;
      if (isJSONObject(value)) {
        camelizedValue = camelCaseKeys(value);
      }
      newObj[util.camelCase(key)] = camelizedValue;
    }
  }

  return newObj;
}

type JSONObject = { [key: string]: unknown } | unknown[];

function isJSONObject(value: unknown): value is JSONObject {
  return Array.isArray(value) || (value !== null && typeof value === 'object');
}
