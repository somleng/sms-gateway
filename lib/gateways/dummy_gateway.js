import { setTimeout as setTimeoutAsync } from "timers/promises";
import { randomUUID } from "crypto";

class DummyGateway {
  #onDeliveryReceiptCallback;
  #onReceivedCallback;

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
    const response = { messageId: randomUUID() };

    await setTimeoutAsync(1000);
    console.log(`DummyGateway.sendMessage(${channel}, ${JSON.stringify(params)}) was called`);

    setTimeout(() => {
      const status = channel !== 999 ? "delivered" : "failed";
      this.#onDeliveryReceiptCallback &&
        this.#onDeliveryReceiptCallback({ messageId: response.messageId, status: status });
    }, 1000);

    return response;
  }

  onReceived(callback) {
    console.log("Subscribed to DummyGateway.onReceived()");
    this.#onReceivedCallback = callback;
  }

  onDeliveryReceipt(callback) {
    console.log("Subscribed to DummyGateway.onDeliveryReceipt()");
    this.#onDeliveryReceiptCallback = callback;
  }
}

export default DummyGateway;
