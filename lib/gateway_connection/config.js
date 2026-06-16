import { readFileSync } from "fs";
import { SUPPORTED_MODES } from "../gateways/index.js";

function buildConnectionConfigsFromFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    const config = JSON.parse(content);
    const connections = Object.entries(config);

    if (connections.length === 0) {
      throw new Error("Config file must contain at least one connection.");
    }

    return connections.map(([name, connectionConfig]) => {
      if (!SUPPORTED_MODES.has(connectionConfig.mode)) {
        throw new Error(`${name}.mode must be one of ${Array.from(SUPPORTED_MODES).join(", ")}.`);
      }

      return {
        name,
        deviceKey: connectionConfig.deviceKey,
        mode: connectionConfig.mode,
        options: connectionConfig.options ?? {},
      };
    });
  } catch (error) {
    throw new Error(`Failed to load config file: ${error.message}`);
  }
}

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

export { buildConnectionConfigsFromFile, buildInlineConnectionConfig };
