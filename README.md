ts-twirp is a TypeScript code generator for [Twirp](https://github.com/twitchtv/twirp) servers and clients.

> The client portion of this library is nascent.

## Make a Twirp Server

Install `ts-twirp`.

```
npm install --save-dev ts-twirp
```

ts-twirp takes an opinionated approach to file organization. Each protobuf
file lives in its own directory and ts-twirp generates sibling files that you
can `.gitignore`.

Place your server's protobuf file in its own directory.

```
/src
  /twirp
    service.proto
```

Run `ts-twirp` on `service.proto`.

```
npx ts-twirp src/twirp/service.proto
```

This generates sibling files in the same directory.

```
/src
  /twirp
    index.ts # Exports the code you'll use to implement your server
    service.pb.d.ts # Protobuf types generated from your *.protofile
    service.pb.ts # Runtime protobuf serialization/deserialization code
    service.proto # The service protobuf definition
    server.ts # Runtime TypeScript server code
```

Use `src/twirp/index.ts` as the entry point to the service types and runtime
code.

```ts
// ./src/server.ts
import http from 'http';
import { createHaberdasherHandler } from './twirp';

const handler = createHaberdasherHandler({
  async makeHat(size) {
    return ({
      color: 'red',
      name: 'fancy hat',
      size: size.inches
    });
  }
});

http.createServer(handler).listen(8000);
```

## Make a Twirp Client

Running the generator will create both a protobuf and a JSON client.

Using the protobuf client:

```ts
import { createHaberdasherProtobufClient } from './twirp';

async function run() {
  const haberdasher = createHaberdasherProtobufClient({
    host: 'localhost',
    port: 8000,
  });

  const hat = await haberdasher.makeHat({
    inches: 42
  });

  console.log(hat);
}

run();
```

As you might expect using the JSON client is nearly identical.

```ts
import { createHaberdasherJSONClient } from './twirp';

async function run() {
  const haberdasher = createHaberdasherJSONClient({
    host: 'localhost',
    port: 8000,
  });

  const hat = await haberdasher.makeHat({
    inches: 42
  });

  console.log(hat);
}

run();
```
