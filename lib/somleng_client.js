/* eslint-disable max-classes-per-file */

import WebSocket from "ws";
import { createCable, Channel } from "@anycable/core";

class SMSMessageChannel extends Channel {
  static identifier = "SMSMessageChannel";
}

class SomlengClient {
  #cable;
  #messageChannel;

  constructor(config) {
    this.domain = config.domain;
    this.deviceKey = config.deviceKey;

    this.#cable = config.cable || this.#createCable();
    this.#messageChannel = new SMSMessageChannel();
  }

  async subscribe() {
    return this.#cable.subscribe(this.#messageChannel).ensureSubscribed();
  }

  onNewMessage(callback) {
    return this.#messageChannel.on("message", callback);
  }

  async notifyDeliveryReceipt(data) {
    return this.#messageChannel.perform("delivered", data);
  }

  #createCable() {
    return createCable(`${this.domain}/cable`, {
      websocketImplementation: WebSocket,
      websocketOptions: { headers: { "x-device-key": this.deviceKey } },
    });
  }
}

export default SomlengClient;
