import { setTimeout as setTimeoutAsync } from "timers/promises";

class DummyGateway {
  #onSentCallback;
  #onReceivedCallback;

  constructor() {}

  async connect() {
    await setTimeoutAsync(1000);
    console.log("DummyGateway.connect() was called");
  }

  config() {
    return {};
  }

  isConnected() {
    return true;
  }

  async sendMessage(params) {
    const channel = params.channel;
    const deliveryReceipt = { messageId: 1 };

    await setTimeoutAsync(1000);
    console.log(`DummyGateway.sendMessage(${channel}, ${JSON.stringify(params)}) was called`);

    setTimeout(() => {
      deliveryReceipt.status = channel !== 999 ? "sent" : "failed";
      this.#onSentCallback && this.#onSentCallback(deliveryReceipt);
    }, 1000);

    return deliveryReceipt;
  }

  onReceived(callback) {
    console.log("Subscribed to DummyGateway.onReceived()");
    this.#onReceivedCallback = callback;
  }

  onSent(callback) {
    console.log("Subscribed to DummyGateway.onSent()");
    this.#onSentCallback = callback;
  }
}

export default DummyGateway;
