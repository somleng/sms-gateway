import { setTimeout as setTimeoutAsync } from "timers/promises";

class DummyGateway {
  #onSentCallback;

  constructor(config) {
    this.host = config.host;
  }

  async connect() {
    await setTimeoutAsync(1000);
    console.log("DummyGateway.connect() was called");
  }

  async sendMessage(channelId, params) {
    const deliveryReceipt = { messageId: 1 };

    await setTimeoutAsync(1000);
    console.log(`DummyGateway.sendMessage(${channelId}, ${JSON.stringify(params)}) was called`);

    setTimeout(() => {
      this.#onSentCallback && this.#onSentCallback(deliveryReceipt);
    }, 1000);

    return deliveryReceipt;
  }

  onReceived(_callback) {
    console.log("Subscribed to DummyGateway.onReceived()");
  }

  onSent(callback) {
    console.log("Subscribed to DummyGateway.onSent()");
    this.#onSentCallback = callback;
  }
}

export default DummyGateway;
