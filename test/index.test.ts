import * as pb from './service.pb';
import Example = pb.twitch.twirp.example;
import { AsyncServer } from './async-server';
import request from 'request-promise-native';
import { createTwirpClient } from 'ts-twirp';
import * as protobuf from 'protobufjs';
import * as path from 'path';
import { example, createHaberdasherHandler } from './index';

test('Handling a Twirp protobuf call', async () => {
  function makeHat(size: Example.Size): Promise<Example.Hat> {
    const response = new Example.Hat({
      color: 'red',
      name: 'fancy hat',
      size: size.inches,
    });

    return Promise.resolve(response);
  }

  const handler = createHaberdasherHandler({
    makeHat,
  });

  const s = await new AsyncServer(handler).listen();
  const pb = await protobuf.load(path.join(__dirname, 'service.proto'));
  const service = pb.lookupService('Haberdasher');

  const client = createTwirpClient<example.Haberdasher>({
    host: 'localhost',
    port: 8000,
    service: service,
  });

  const response = await client.makeHat({
    inches: 42,
  });

  try {
    expect(response.size).toEqual(42);
    expect(response.name).toEqual('fancy hat');
    expect(response.color).toEqual('red');
  } finally {
    await s.close();
  }
});

test('Handling a Twirp JSON call', async () => {
  function makeHat(size: Example.Size): Promise<Example.Hat> {
    const response = new Example.Hat({
      color: 'red',
      name: 'fancy hat',
      size: size.inches,
    });

    return Promise.resolve(response);
  }

  const handler = createHaberdasherHandler({
    makeHat,
  });

  const s = await new AsyncServer(handler).listen();
  const response = await request(`http://localhost:8000/twitch.twirp.example.Haberdasher/MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    resolveWithFullResponse: true,
  });

  try {
    expect(response.headers['content-length']).toEqual("44");
    const json = JSON.parse(response.body);
    expect(json.size).toEqual(42);
    expect(json.name).toEqual('fancy hat');
    expect(json.color).toEqual('red');
  } finally {
    await s.close();
  }
});

test('Protobuf error is returned as JSON', async () => {
  function makeHat(size: Example.Size): Promise<Example.Hat> {
    throw new Error("thrown!");
  }

  const handler = createHaberdasherHandler({
    makeHat,
  });

  const s = await new AsyncServer(handler).listen();
  const pb = await protobuf.load(path.join(__dirname, 'service.proto'));
  const service = pb.lookupService('Haberdasher');

  const client = createTwirpClient<Example.Haberdasher>({
    host: 'localhost',
    port: 8000,
    service: service,
  });

  let response: Example.Hat | undefined;
  let errorResponse: Error | undefined;
  try {
    response = await client.makeHat({
      inches: 42,
    });
  } catch(e) {
    errorResponse = e;
  }

  expect(response).toBe(undefined);
  expect(errorResponse!.message).toEqual('thrown!');
  expect(errorResponse!.name).toEqual('internal');

  await s.close();
});

test('Missing route returns 404', async () => {
  function makeHat(size: Example.Size): Promise<Example.Hat> {
    const response = new Example.Hat({
      color: 'red',
      name: 'fancy hat',
      size: size.inches,
    });

    return Promise.resolve(response);
  }

  const handler = createHaberdasherHandler({
    makeHat,
  });

  const s = await new AsyncServer(handler).listen();

  const response = await request(`http://localhost:8000/twitch.twirp.example.Haberdasher/MakePants`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    resolveWithFullResponse: true,
    simple: false,
  });

  try {
    expect(response.statusCode).toEqual(404);
    expect(response.headers['content-type']).toEqual('application/json');
    const body = JSON.parse(response.body);
    expect(body).toEqual({
      code: 'bad_route',
      msg: 'no handler for path /twitch.twirp.example.Haberdasher/MakePants',
    });
  } finally {
    await s.close();
  }
});
