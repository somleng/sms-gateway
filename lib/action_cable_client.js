import WebSocket from "ws";
import { createCable, Channel } from "@anycable/core";

class MessageChannel extends Channel {
  static identifier = "MessageChannel";
}

class ActionCableClient {
  constructor(config) {
    this.domain = config.domain;
    this.deviceKey = config.deviceKey;

    this._cable = this._createCable();
    this._messageChannel = new MessageChannel();
  }

  async subscribe() {
    return this._cable.subscribe(this._messageChannel).ensureSubscribed();
  }

  onNewMessage(callback) {
    return this._messageChannel.on("message", callback);
  }

  async notifyDeliveryReceipt(data) {
    return this._messageChannel.perform("delivered", data);
  }

  _createCable() {
    return createCable(`${this.domain}/cable`, {
      websocketImplementation: WebSocket,
      websocketOptions: { headers: { "x-device-key": this.deviceKey } },
    });
  }
}

export default ActionCableClient;
