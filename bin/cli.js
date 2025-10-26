#!/usr/bin/env node

import { program } from "commander";
import { createLogger, format, transports } from "winston";
import "@sentry/tracing";
import * as Sentry from "@sentry/node";

import SomlengClient from "../lib/somleng_client.js";
import HTTPServer from "../lib/http_server/index.js";
import { GoIPGateway, SMPPGateway, DummyGateway } from "../lib/gateways/index.js";
import packageJson from "../package.json" with { type: "json" };

Sentry.init({
  dsn: "https://b4c80554595b4e75a9904318a8fe005d@o125014.ingest.sentry.io/4504756942864384",
  release: packageJson.version,
});

async function main() {
  let options = {};
  let gateway;
  let outboundQueue = new Map();

  program
    .requiredOption("-k, --key <value>", "Device key")
    .requiredOption("-d, --domain <value>", "Somleng Domain", "wss://app.somleng.org")
    .requiredOption("-p, --http-server-port <value>", "HTTP Server Port", "3210")
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
    .command("smpp")
    .description("connect to SMPP Gateway")
    .requiredOption("--smpp-host <value>", "SMPP host")
    .requiredOption("--smpp-port <value>", "SMPP port", "2775")
    .requiredOption("--smpp-system-id <value>", "SMPP System ID")
    .requiredOption("--smpp-password <value>", "SMPP password")
    .option("--flash-sms-encoding", "Enable Flash SMS encoding")
    .action((commandOptions) => {
      gateway = new SMPPGateway({
        host: commandOptions.smppHost,
        port: commandOptions.smppPort,
        systemId: commandOptions.smppSystemId,
        password: commandOptions.smppPassword,
        flashSmsEncoding: commandOptions.flashSmsEncoding,
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
      format.json(),
    ),
    transports: [new transports.Console()],
  });

  logger.debug("Connecting to Gateway");
  await gateway.connect();

  const client = new SomlengClient({
    domain: options.domain,
    deviceKey: options.key,
    logger: logger,
  });

  const httpServer = new HTTPServer({
    port: options.httpServerPort,
    gateway: gateway,
    somlengClient: client,
  });
  httpServer.start();

  const notifyMessageStatus = async (id, status) => {
    return await client.notifyMessageStatus({
      id: id,
      status: status,
    });
  };

  logger.debug("Connecting to Somleng");
  await client.subscribe();

  client.onNewMessage(async (message) => {
    try {
      const response = await gateway.sendMessage({
        channel: message.channel,
        source: message.from,
        destination: message.to,
        shortMessage: message.body,
      });

      logger.debug("Sending a message", message);

      if (response.messageId && response.messageId.toString().length) {
        outboundQueue.set(response.messageId, { messageId: message.id });

        await notifyMessageStatus(message.id, "sent");
      } else {
        await notifyMessageStatus(message.id, "failed");
      }
    } catch (e) {
      console.error(e.message);
      await notifyMessageStatus(message.id, "failed");
    }
  });

  gateway.onDeliveryReceipt(async (deliveryReceipt) => {
    logger.debug("onDeliveryReceipt", deliveryReceipt);

    const numericMessageId = parseInt(deliveryReceipt.messageId).toString();
    let queueKey;

    if (outboundQueue.has(deliveryReceipt.messageId)) {
      queueKey = deliveryReceipt.messageId;
    } else if (outboundQueue.has(numericMessageId)) {
      queueKey = numericMessageId;
    }

    if (queueKey) {
      const outboundMessage = outboundQueue.get(queueKey);

      logger.debug("notifyMessageStatus: ", outboundMessage.messageId);

      // "sent" is handled in onNewMessage
      if (deliveryReceipt.status !== "sent") {
        await notifyMessageStatus(outboundMessage.messageId, deliveryReceipt.status);
      }

      outboundQueue.delete(queueKey);
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
  Sentry.captureException(error);
  process.exit(1);
});
