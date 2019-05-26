import * as pb from './service.pb';
import Example = pb.twitch.twirp.example;
import { AsyncServer } from './async-server';
import { createHaberdasherHandler } from './service';
import { createHaberdasher } from './service.twirp';
import request from 'request-promise-native';
import { createTwirpClient } from './client';
import * as protobuf from 'protobufjs';
import * as path from 'path';

test('Handling a Twirp protobuf call with protoc-gen-twirp_typescript', async () => {
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

  const client = createHaberdasher('http://localhost:8000');

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

test('Handling a Twirp protobuf call with custom ts-twirp-server client', async () => {
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

  const client = createTwirpClient<Example.Haberdasher>({
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
  const responseJSON = await request(`http://localhost:8000/twitch.twirp.example.Haberdasher/MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      "Content-Type": "application/json",
    }
  });
  const response = JSON.parse(responseJSON);

  try {
    expect(response.size).toEqual(42);
    expect(response.name).toEqual('fancy hat');
    expect(response.color).toEqual('red');
  } finally {
    await s.close();
  }
});

test('Returning the Content-Length header', async () => {
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
