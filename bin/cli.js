#!/usr/bin/env node

import { program } from "commander";

import SomlengClient from "../lib/somleng_client.js";
import SMPPGateway from "../lib/smpp_gateway.js";

import { readFileSync } from "fs";

async function run() {
  program
    .requiredOption("-c, --credentials <file>", "Credentials file")
    .requiredOption("-d, --domain <value>", "Somleng Domain", "wss://app.somleng.org")
    .option("-v, --verbose", "Output extra debugging")
    .showHelpAfterError()
    .parse();
  const options = program.opts();

  const configData = readFileSync(options.credentials);
  const config = JSON.parse(configData);

  config.verbose = options.verbose || config.verbose;
  config.domain = options.domain || config.domain;

  const client = new SomlengClient({
    domain: config.domain,
    deviceKey: config.key,
  });
  await client.subscribe();

  const smppGateways = {};
  config.channels.forEach(async (channel) => {
    smppGateways[channel.id] = new SMPPGateway({
      host: channel.smppHost,
      port: channel.smppPort,
      systemId: channel.systemId,
      password: channel.password,
      debug: config.verbose,
    });

    await smppGateways[channel.id].connect();
  });

  client.onNewMessage(async (message) => {
    const deliveryReceipt = await smppGateways[message.channelId].sendMessage({
      destination: message.to,
      short_message: message.message,
    });

    await client.notifyDeliveryReceipt({
      id: message.id,
      externalMessageId: deliveryReceipt.messageId,
      status: deliveryReceipt.status,
    });
  });
}

run();
