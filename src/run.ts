#!/usr/bin/env node

import { load, Message, Root } from 'protobufjs';
import * as path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as Handlebars from 'handlebars';
import * as descriptor from 'protobufjs/ext/descriptor';
import 'protobufjs/ext/descriptor';
import { pbjs, pbts } from 'protobufjs/cli';

Handlebars.registerHelper('lowercase', function(text: string) {
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
});

type Protofile = Message<descriptor.IFileDescriptorSet>;

async function run() {
  const protofilePath = process.argv[2];
  if (!protofilePath) {
    throw new Error("Provide the path to a service.proto file");
  }
  const fileParts = path.parse(protofilePath);
  if (fileParts.ext !== '.proto') {
    throw new Error("Path must point to a .proto file");
  }

  const runtimeJSPath = `${fileParts.dir}/${fileParts.name}.pb.js`;
  const typeDefsPath = `${fileParts.dir}/${fileParts.name}.pb.d.ts`;
  pbjs.main(['-t', 'static-module', '-w', 'commonjs', '-o', runtimeJSPath, protofilePath]);
  pbts.main(['-o', typeDefsPath, runtimeJSPath]);

  const tsServerPath = `${fileParts.dir}/${fileParts.name}.ts`;
  const root = await load(protofilePath);
  const descriptor: Protofile = (root as any).toDescriptor('proto3');
  await generateServer(root, descriptor, tsServerPath);
  await generateIndex(root, descriptor, fileParts.name, `${fileParts.dir}/index.ts`);
}

async function generateServer(root: Root, descriptor: Protofile, tsServerPath: string) {
  const template = readFileSync(path.join(__dirname, 'server.hbs'), 'utf8');
  const service = root.lookupService(getServiceName(descriptor));
  const namespace = service.fullName.split('.').slice(1, -1).join('.');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate({
    methods: service.methods,
    service: service.name,
    namespace,
  });
  writeFileSync(tsServerPath, tsOutput);
}

function generateIndex(root: Root, descriptor: Protofile, name: string, indexPath: string, ) {
  const service = root.lookupService(getServiceName(descriptor));
  const namespace = service.fullName.split('.').slice(1, -1).join('.');
  const out = [
    `import * as pb from './${name}.pb';`,
    `import * as service from './${name}';`,
    `export = {`,
    `  ...pb.${namespace},`,
    `  ...service`,
    `};`,
  ]

  writeFileSync(indexPath, out.join('\n'));
}

function getServiceName(protofile: Protofile) {
  return protofile.toJSON().file[0].service[0].name;
}

run();
