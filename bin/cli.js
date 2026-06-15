#!/usr/bin/env node

import * as Sentry from "@sentry/node";
import packageJson from "../package.json" with { type: "json" };

import { program } from "commander";
import { createLogger, format, transports } from "winston";

import HTTPServer from "../lib/http_server/index.js";
import {
  buildGatewayConnections,
  buildConnectionConfigs,
} from "../lib/gateway_connection/index.js";
import { SUPPORTED_MODES } from "../lib/gateways/index.js";

const SENTRY_DSN =
  "https://b4c80554595b4e75a9904318a8fe005d@o125014.ingest.us.sentry.io/4504756942864384";

function hasConfigOption(argv) {
  return argv.some((arg) => arg === "-c" || arg === "--config" || arg.startsWith("--config="));
}

function hasInlineCommand(argv) {
  return argv.some((arg) => SUPPORTED_MODES.has(arg));
}

async function main() {
  let inlineCommand = null;
  const rawArgs = process.argv.slice(2);
  const configMode = hasConfigOption(rawArgs);

  program
    .option("-d, --domain <value>", "Somleng Domain", "wss://app.somleng.org")
    .option("-p, --http-server-port <value>", "HTTP Server Port", "3210")
    .option("-e, --environment <value>", "Environment (production or development)", "development")
    .option(
      "-k, --key <value>",
      "Device key (required for running a single connection in inline mode)",
    )
    .option("-c, --config <value>", "Run multiple gateway connections from a JSON config file")
    .option("-v, --verbose", "Output extra debugging")
    .showHelpAfterError();

  if (configMode && hasInlineCommand(rawArgs)) {
    throw new Error("Cannot use --config together with a connection mode command.");
  }

  if (hasInlineCommand(rawArgs)) {
    program
      .command("goip")
      .description("connect to GoIP Gateway")
      .requiredOption("--goip-smpp-host <value>", "SMPP host")
      .requiredOption("--goip-smpp-port <value>", "SMPP port", "2775")
      .requiredOption("--goip-smpp-system-id <value>", "SMPP System ID")
      .requiredOption("--goip-smpp-password <value>", "SMPP password")
      .requiredOption("--goip-channels <value>", "Number of channels")
      .action((commandOptions) => {
        inlineCommand = { name: "goip", options: commandOptions };
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
        inlineCommand = { name: "smpp", options: commandOptions };
      });

    program
      .command("dummy")
      .description("connect to dummy Gateway")
      .action(() => {
        inlineCommand = { name: "dummy", options: {} };
      });
  }

  await program.parseAsync(process.argv);
  const options = program.opts();

  if (!options.config && !inlineCommand) {
    program.help({ error: true });
  }

  Sentry.init({
    dsn: options.environment === "production" ? SENTRY_DSN : null,
    release: packageJson.version,
  });

  const logger = createLogger({
    level: options.verbose ? "debug" : "info",
    format: format.combine(
      format.label({ label: "Somleng SMS Gateway" }),
      format.timestamp(),
      format.json(),
    ),
    transports: [new transports.Console()],
  });

  const connectionConfigs = buildConnectionConfigs({ inlineCommand, options });
  const gatewayConnections = buildGatewayConnections({
    connectionConfigs,
    domain: options.domain,
    logger,
    verbose: options.verbose,
  });

  for (const gatewayConnection of gatewayConnections) {
    await gatewayConnection.connect();
  }

  const httpServer = new HTTPServer({
    port: options.httpServerPort,
    gatewayConnections,
  });
  await httpServer.start();
}

main().catch((error) => {
  console.error(error);
  Sentry.captureException(error);

  // Cannot use process.exit(1) here because it will not trigger the Sentry error capture
  process.exitCode = 1;
});
