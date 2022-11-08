#!/usr/bin/env node

import { program, Option } from "commander";

import SomlengClient from "../lib/somleng_client.js";
import { GoIPGateway, DummyGateway } from "../lib/gateways/index.js";

async function main() {
  let options = {};
  let gateway;
  let outboundQueue = new Map();

  program
    .requiredOption("-k, --key <value>", "Device key")
    .requiredOption("-d, --domain <value>", "Somleng Domain", "wss://app.somleng.org")
    .option("-v, --verbose", "Output extra debugging")
    .showHelpAfterError();

  program
    .command("goip")
    .description("connect to GoIP Gateway")
    .requiredOption("--goip-smpp-host <value>", "SMPP host")
    .requiredOption("--goip-smpp-port <value>", "SMPP port", "2775")
    .requiredOption("--goip-smpp-system-id <value>", "SMPP System ID")
    .requiredOption("--goip-smpp-password <value>", "SMPP password")
    .requiredOption("--goip-channels <value>", "Number of channels")
    .action((commandOptions) => {
      gateway = new GoIPGateway({
        host: commandOptions.goipSmppHost,
        port: commandOptions.goipSmppPort,
        systemId: commandOptions.goipSmppSystemId,
        password: commandOptions.goipSmppPassword,
        channels: commandOptions.goipChannels,
        debug: program.opts().verbose,
      });
    });

  program
    .command("dummy")
    .description("connect to dummy Gateway")
    .requiredOption("--dummy-host <value>", "Dummy host")
    .action((commandOptions) => {
      gateway = new DummyGateway({
        host: commandOptions.dummyHost,
      });
    });

  program.parse();
  options = { ...options, ...program.opts() };

  await gateway.connect();

  const client = new SomlengClient({
    domain: options.domain,
    deviceKey: options.key,
  });
  await client.subscribe();

  client.onNewMessage(async (message) => {
    try {
      const deliveryReceipt = await gateway.sendMessage(message.channelId, {
        destination: message.to,
        short_message: message.message,
      });

      outboundQueue.set(deliveryReceipt.messageId, { messageId: message.id });
      setTimeout(() => outboundQueue.delete(deliveryReceipt.messageId), 10000); // Clean up weather if it sent or not
    } catch (e) {
      console.error(e.message);
    }
  });

  gateway.onSent(async (deliveryReceipt) => {
    await client.notifyDeliveryReceipt({
      id: outboundQueue.get(deliveryReceipt.messageId).messageId,
      externalMessageId: deliveryReceipt.messageId,
    });

    outboundQueue.delete(deliveryReceipt.messageId);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
