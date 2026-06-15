import SomlengClient from "../somleng_client.js";
import GatewayConnection from "../gateway_connection.js";
import { createGateway } from "../gateways/index.js";
import { loadGatewayConfig } from "./config_loader.js";

function buildInlineConnectionConfig({ commandName, commandOptions, deviceKey }) {
  switch (commandName) {
    case "smpp":
      return {
        name: "smpp",
        deviceKey,
        mode: "smpp",
        options: {
          host: commandOptions.smppHost,
          port: commandOptions.smppPort,
          systemId: commandOptions.smppSystemId,
          password: commandOptions.smppPassword,
          flashSmsEncoding: commandOptions.flashSmsEncoding,
        },
      };
    case "goip":
      return {
        name: "goip",
        deviceKey,
        mode: "goip",
        options: {
          host: commandOptions.goipSmppHost,
          port: commandOptions.goipSmppPort,
          systemId: commandOptions.goipSmppSystemId,
          password: commandOptions.goipSmppPassword,
          channels: commandOptions.goipChannels,
        },
      };
    case "dummy":
      return {
        name: "dummy",
        deviceKey,
        mode: "dummy",
        options: {},
      };
    default:
      throw new Error(`Unsupported inline command: ${commandName}`);
  }
}

function buildGatewayConnections({ connectionConfigs, domain, logger, verbose }) {
  return connectionConfigs.map((connectionConfig) => {
    const connectionLogger = logger.child({
      connection: connectionConfig.name,
      mode: connectionConfig.mode,
    });

    return new GatewayConnection({
      name: connectionConfig.name,
      mode: connectionConfig.mode,
      deviceKey: connectionConfig.deviceKey,
      gateway: createGateway({
        mode: connectionConfig.mode,
        options: connectionConfig.options,
        debug: verbose,
      }),
      somlengClient: new SomlengClient({
        domain,
        deviceKey: connectionConfig.deviceKey,
        logger: connectionLogger,
      }),
      logger: connectionLogger,
    });
  });
}

function buildConnectionConfigs({ inlineCommand, options }) {
  if (options.config) {
    return loadGatewayConfig(options.config);
  }

  if (!options.key) {
    throw new Error("Option '-k, --key <value>' is required");
  }

  return [
    buildInlineConnectionConfig({
      commandName: inlineCommand.name,
      commandOptions: inlineCommand.options,
      deviceKey: options.key,
    }),
  ];
}

export { buildInlineConnectionConfig, buildGatewayConnections, buildConnectionConfigs };
