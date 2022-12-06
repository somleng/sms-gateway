#!/usr/bin/env node

import { program } from "commander";
import { createLogger, format, transports } from "winston";

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
    .action((commandOptions) => {
      gateway = new DummyGateway();
    });

  program.parse();
  options = { ...options, ...program.opts() };

  const logger = createLogger({
    level: options.verbose ? "debug" : "info",
    format: format.combine(
      format.label({ label: "Somleng SMS Gateway" }),
      format.timestamp(),
      format.json()
    ),
    transports: [new transports.Console()],
  });

  logger.debug("Connecting to gateway");
  await gateway.connect();

  const client = new SomlengClient({
    domain: options.domain,
    deviceKey: options.key,
  });
  logger.debug("Connecting to Somleng");
  await client.subscribe();

  client.onNewMessage(async (message) => {
    logger.debug("onNewMessage", message);

    try {
      const deliveryReceipt = await gateway.sendMessage({
        channel: message.channel,
        source: message.from,
        destination: message.to,
        shortMessage: message.body,
      });

      logger.debug("Sending a message", message);
      outboundQueue.set(deliveryReceipt.messageId, { messageId: message.id });
    } catch (e) {
      console.error(e.message);
    }
  });

  gateway.onSent(async (deliveryReceipt) => {
    logger.debug("onSent", deliveryReceipt);

    if (outboundQueue.has(deliveryReceipt.messageId)) {
      logger.debug(
        "notifyDeliveryReceipt: ",
        outboundQueue.get(deliveryReceipt.messageId).messageId,
        deliveryReceipt
      );

      await client.notifyDeliveryReceipt({
        id: outboundQueue.get(deliveryReceipt.messageId).messageId,
        status: deliveryReceipt.status,
      });

      outboundQueue.delete(deliveryReceipt.messageId);
    }
  });

  gateway.onReceived(async (message) => {
    logger.debug("onReceived", message);

    client.receivedMessage({
      from: message.source,
      to: message.destination,
      body: message.shortMessage,
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
