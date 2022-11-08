import SMPPGateway from "./smpp_gateway.js";

class GoIPGateway {
  #smppGateways = new Map();

  constructor(config) {
    this.host = config.host;
    this.port = config.port;
    this.systemId = config.systemId;
    this.password = config.password;
    this.channels = config.channels;
    this.debug = config.debug;

    for (let channelId = 1; channelId <= this.channels; channelId++) {
      this.#smppGateways.set(
        channelId,
        new SMPPGateway({
          host: this.host,
          port: this.port,
          systemId: `${this.systemId}${String(channelId).padStart(2, "0")}`,
          password: this.password,
          debug: this.debug,
        })
      );
    }
  }

  async connect() {
    for (const smppGateway of this.#smppGateways.values()) {
      await smppGateway.connect();
    }
  }

  async sendMessage(channelId, params) {
    if (this.#smppGateways.has(channelId)) {
      const deliveryReceipt = await this.#smppGateways.get(channelId).sendMessage(params);
      return deliveryReceipt;
    } else {
      throw new Error(`Channel #${channelId} doesn't exist.`);
    }
  }

  onReceived(callback) {
    for (const smppGateway of this.#smppGateways.values()) {
      smppGateway.onReceived(callback);
    }
  }

  onSent(callback) {
    for (const smppGateway of this.#smppGateways.values()) {
      smppGateway.onSent(callback);
    }
  }
}

export default GoIPGateway;
