import { readFileSync } from "fs";
import { SUPPORTED_MODES } from "../gateways/index.js";

function loadGatewayConfig(path) {
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

export { loadGatewayConfig };
