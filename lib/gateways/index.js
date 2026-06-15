import GoIPGateway from "./goip_gateway.js";
import DummyGateway from "./dummy_gateway.js";
import SMPPGateway from "./smpp_gateway.js";

const SUPPORTED_MODES = new Set(["smpp", "goip", "dummy"]);

function createGateway({ mode, options, debug }) {
  switch (mode) {
    case "smpp":
      return new SMPPGateway({ ...options, debug });
    case "goip":
      return new GoIPGateway({ ...options, debug });
    case "dummy":
      return new DummyGateway();
  }
}

export { GoIPGateway, SMPPGateway, DummyGateway, SUPPORTED_MODES, createGateway };
