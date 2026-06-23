import GoIPGateway from "./goip_gateway.js";
import DummyGateway from "./dummy_gateway.js";
import SMPPGateway from "./smpp_gateway.js";
import VMGGateway from "./vmg_gateway.js";

const SUPPORTED_MODES = new Set(["smpp", "goip", "dummy", "vmg"]);
const INLINE_COMMAND_MODES = new Set(["smpp", "goip", "dummy"]);

function createGateway({ mode, options, debug }) {
  switch (mode) {
    case "smpp":
      return new SMPPGateway({ ...options, debug });
    case "goip":
      return new GoIPGateway({ ...options, debug });
    case "dummy":
      return new DummyGateway();
    case "vmg":
      return new VMGGateway({ ...options, debug });
  }
}

export {
  GoIPGateway,
  SMPPGateway,
  DummyGateway,
  VMGGateway,
  SUPPORTED_MODES,
  INLINE_COMMAND_MODES,
  createGateway,
};
