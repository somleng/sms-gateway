import SomlengClient from "../somleng_client.js";
import GatewayConnection from "./gateway_connection.js";
import { createGateway } from "../gateways/index.js";
import { buildConnectionConfigsFromFile, buildInlineConnectionConfig } from "./config.js";

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
    return buildConnectionConfigsFromFile(options.config);
  }

  if (!options.key) {
    throw new Error("Option '-k, --key <value>' is required");
  }

  return [
    buildInlineConnectionConfig({
      mode: inlineCommand.name,
      connectionOptions: inlineCommand.options,
      deviceKey: options.key,
    }),
  ];
}

export { GatewayConnection, buildGatewayConnections, buildConnectionConfigs };
