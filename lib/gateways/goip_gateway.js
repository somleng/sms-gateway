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

    for (let channel = 1; channel <= this.channels; channel++) {
      this.#smppGateways.set(
        channel,
        new SMPPGateway({
          host: this.host,
          port: this.port,
          systemId: `${this.systemId}${String(channel).padStart(2, "0")}`,
          password: this.password,
          debug: this.debug,
        })
      );
    }
  }

  config() {
    return {
      host: this.host,
      port: this.port,
      systemId: this.systemId,
      password: this.password,
      channels: this.channels,
    };
  }

  async connect() {
    for (const smppGateway of this.#smppGateways.values()) {
      await smppGateway.connect();
    }
  }

  isConnected() {
    const channel = this.#randomChannel();
    if (this.#smppGateways.has(channel)) {
      return this.#smppGateways.get(channel).isConnected();
    } else {
      return false;
    }
  }

  async sendMessage(params) {
    const channel = params.channel || this.#randomChannel();
    if (this.#smppGateways.has(channel)) {
      const deliveryReceipt = await this.#smppGateways.get(channel).sendMessage(params);
      return deliveryReceipt;
    } else {
      throw new Error(`Channel #${channel} doesn't exist.`);
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

  #randomChannel() {
    let keys = Array.from(this.#smppGateways.keys());
    return keys[Math.floor(Math.random() * keys.length)];
  }
}

export default GoIPGateway;
