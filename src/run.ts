#!/usr/bin/env node

import { load, Message, Root, Service } from 'protobufjs';
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

  const root = await load(protofilePath);
  const descriptor: Protofile = (root as any).toDescriptor('proto3');
  const service = root.lookupService(getServiceName(descriptor));
  const namespace = service.fullName.split('.').slice(1, -1).join('.');
  const shortNamespace = namespace.split('.').slice(-1);

  const templateContext = {
    methods: service.methods,
    service: service.name,
    namespace,
    shortNamespace,
    protoFilename: fileParts.name,
  };

  const tsServerPath = `${fileParts.dir}/${fileParts.name}.ts`;
  await generateServer(tsServerPath, templateContext);

  const tsClientPath = `${fileParts.dir}/client.ts`;
  await generateClient(tsClientPath, templateContext);

  await generateIndex(`${fileParts.dir}/index.ts`, templateContext);
}

function generateIndex(indexPath: string, templateContext: {}) {
  const template = readFileSync(path.join(__dirname, 'index.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(indexPath, tsOutput);
}

async function generateServer(tsServerPath: string, templateContext: {}) {
  const template = readFileSync(path.join(__dirname, 'server.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(tsServerPath, tsOutput);
}

async function generateClient(tsClientPath: string, templateContext: {}) {
  const template = readFileSync(path.join(__dirname, 'client.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(tsClientPath, tsOutput);
}

function getServiceName(protofile: Protofile) {
  return protofile.toJSON().file[0].service[0].name;
}

run();
