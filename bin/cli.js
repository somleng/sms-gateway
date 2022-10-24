#!/usr/bin/env node

import { program } from "commander";

import { ActionCableClient } from "../index.js";
import SMPPGateway from "../lib/smpp_gateway.js";

program
  .requiredOption("-k, --key <value>", "Device key")
  .requiredOption("--smpp-host <value>", "SMPP host")
  .requiredOption("--smpp-port <value>", "SMPP port", "2775")
  .requiredOption("--smpp-system-id <value>", "SMPP System ID")
  .requiredOption("--smpp-password <value>", "SMPP password")
  .requiredOption("-d, --domain <value>", "Somleng Domain", "ws://localhost:3000")
  .option("-v, --verbose", "Output extra debugging")
  .showHelpAfterError()
  .parse();

const options = program.opts();

async function run() {
  const actionCableClient = new ActionCableClient({
    domain: options.domain,
    deviceKey: options.key,
  });
  await actionCableClient.subscribe();

  const smppGateway = new SMPPGateway({
    host: options.smppHost,
    port: options.smppPort,
    systemId: options.smppSystemId,
    password: options.smppPassword,
    debug: options.verbose,
  });
  await smppGateway.connect();

  actionCableClient.onNewMessage(async (message) => {
    const deliveryReceipt = await smppGateway.sendMessage({
      destination: message.to,
      short_message: message.message,
    });

    await actionCableClient.notifyDeliveryReceipt({
      id: message.id,
      externalMessageId: deliveryReceipt.messageId,
      status: deliveryReceipt.status,
    });
  });
}

run();
