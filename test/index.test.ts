import * as pb from './service.pb';
import Example = pb.twitch.twirp.example;
import { AsyncServer } from './async-server';
import request from 'request-promise-native';
import {
  createHaberdasherProtobufClient,
  createHaberdasherHandler,
  haberdasherPathPrefix,
} from './index';

let protobufClient: Example.Haberdasher;
let server: AsyncServer;

beforeAll(async () => {
  server = await new AsyncServer().listen();

  protobufClient = createHaberdasherProtobufClient({
    host: 'localhost',
    port: 8000,
  });
});

afterAll(async () => {
  server.close();
})

test('Handling a Twirp protobuf call', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    }
  });

  const response = await protobufClient.makeHat({
    inches: 42,
  });

  expect(response).toEqual({
    size: 42,
    name: 'fancy hat',
    color: 'red',
  });
});

test('Handling a Twirp JSON call', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    }
  });

  const response = await request(`http://localhost:8000${haberdasherPathPrefix}MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    resolveWithFullResponse: true,
    method: 'POST',
  });

  expect(response.headers['content-length']).toEqual("44");
  expect(JSON.parse(response.body)).toEqual({
    size: 42,
    name: 'fancy hat',
    color: 'red',
  });
});

test('Protobuf error is returned as JSON', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      throw new Error("thrown!");
    }
  });

  const request = protobufClient.makeHat({
    inches: 42,
  });

  await expect(request).rejects.toEqual(expect.objectContaining({
    message: 'thrown!',
    name: 'internal',
  }));
});

test('Missing route returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    }
  });

  const response = await request(`http://localhost:8000${haberdasherPathPrefix}MakePants`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    resolveWithFullResponse: true,
    simple: false,
    method: 'POST',
  });

  expect(response.statusCode).toEqual(404);
  expect(response.headers['content-type']).toEqual('application/json');
  const body = JSON.parse(response.body);
  expect(body).toEqual({
    code: 'bad_route',
    msg: `no handler for path ${haberdasherPathPrefix}MakePants`,
  });
});

test('Unknown content type returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    }
  });

  const response = await request(`http://localhost:8000${haberdasherPathPrefix}MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "image/png",
    },
    resolveWithFullResponse: true,
    simple: false,
    method: 'POST',
  });

  expect(response.statusCode).toEqual(404);
  expect(response.headers['content-type']).toEqual('application/json');
  const body = JSON.parse(response.body);
  expect(body).toEqual({
    code: 'bad_route',
    msg: 'unexpected Content-Type: image/png',
  });
});

test('Non POST verb returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Example.Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    }
  });

  const response = await request(`http://localhost:8000${haberdasherPathPrefix}MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    resolveWithFullResponse: true,
    simple: false,
    method: 'GET',
  });

  expect(response.statusCode).toEqual(404);
  expect(response.headers['content-type']).toEqual('application/json');
  const body = JSON.parse(response.body);
  expect(body).toEqual({
    code: 'bad_route',
    msg: 'unsupported method GET (only POST is allowed)',
  });
});

test('exposing the path prefix', async () => {
  expect(haberdasherPathPrefix).toBe('/twirp/twitch.twirp.example.Haberdasher/');
});
