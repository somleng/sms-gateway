/* eslint-disable max-classes-per-file */

import WebSocket from "ws";
import { createCable, Channel } from "@anycable/core";

class SMSMessageChannel extends Channel {
  static identifier = "SMSMessageChannel";
}

class SMSGatewayConnectionChannel extends Channel {
  static identifier = "SMSGatewayConnectionChannel";
}

class SomlengClient {
  #cable;
  #messageChannel;
  #connectionChannel;

  constructor(config) {
    this.domain = config.domain;
    this.deviceKey = config.deviceKey;
    this.logger = config.logger;

    this.#cable = config.cable || this.#createCable();
    this.#messageChannel = new SMSMessageChannel();
    this.#connectionChannel = new SMSGatewayConnectionChannel();
  }

  async subscribe() {
    await this.#cable.subscribe(this.#messageChannel).ensureSubscribed();
    await this.#cable.subscribe(this.#connectionChannel).ensureSubscribed();

    this.#ping();
  }

  isConnected() {
    return this.#connectionChannel.state === "connected";
  }

  onNewMessage(callback) {
    return this.#messageChannel.on("message", async (data) => {
      if (data.type === "new_message") {
        this.logger.debug("[outbound new_message]", data);
        await this.#messageChannel.perform("sending", { id: data.message_id });
      } else if (data.type === "confirmed_sending") {
        this.logger.debug("[outbound confirmed_sending]", data);
        await callback(data.message);
      } else {
        // Unhandled message type
      }
    });
  }

  async notifyMessageStatus(data) {
    return await this.#messageChannel.perform("sent", data);
  }

  async receivedMessage(message) {
    return await this.#messageChannel.perform("received", message);
  }

  #createCable() {
    return createCable(`${this.domain}/cable`, {
      protocol: "actioncable-v1-ext-json",
      websocketImplementation: WebSocket,
      websocketOptions: { headers: { "x-device-key": this.deviceKey } },
    });
  }

  #ping() {
    setInterval(async () => {
      if (this.isConnected()) {
        await this.#connectionChannel.perform("ping");
      }
    }, 30000);
  }
}

export default SomlengClient;
