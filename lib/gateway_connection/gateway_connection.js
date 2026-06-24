const MASKED_OPTION_KEY_PARTS = ["password", "token", "secret", "api", "key"];

class GatewayConnection {
  #outboundQueue = new Map();

  constructor(config) {
    this.name = config.name;
    this.mode = config.mode;
    this.deviceKey = config.deviceKey;
    this.gateway = config.gateway;
    this.somlengClient = config.somlengClient;
    this.logger = config.logger;

    this.#setupHandlers();
  }

  async connect() {
    this.logger.debug("Connecting to gateway");
    await this.gateway.connect();

    this.logger.debug("Connecting to Somleng");
    await this.somlengClient.subscribe();
  }

  async disconnect() {
    await Promise.allSettled([this.somlengClient.disconnect(), this.gateway.disconnect()]);
  }

  isHealthy() {
    return this.gateway.isConnected() && this.somlengClient.isConnected();
  }

  status() {
    return {
      name: this.name,
      mode: this.mode,
      somlengConnectionStatus: this.somlengClient.isConnected(),
      gatewayConnectionStatus: this.gateway.isConnected(),
      options: this.#sanitizedOptions(),
    };
  }

  #setupHandlers() {
    this.somlengClient.onNewMessage(async (message) => {
      try {
        this.logger.debug("Sending a message", {
          connectionName: this.name,
          connectionMode: this.mode,
          message,
        });

        const response = await this.gateway.sendMessage({
          messageId: message.id,
          channel: message.channel,
          source: message.from,
          destination: message.to,
          shortMessage: message.body,
        });

        if (!this.#messageSendSucceeded(response)) {
          await this.#notifyMessageStatus(message.id, "failed");
          return;
        }

        if (this.gateway.supportsDeliveryReceipt()) {
          this.#outboundQueue.set(response.messageId.toString(), { messageId: message.id });
        }

        await this.#notifyMessageStatus(message.id, "sent");
      } catch (error) {
        this.logger.error("Failed to send message", {
          error: error.message,
          messageId: message.id,
        });
        await this.#notifyMessageStatus(message.id, "failed");
      }
    });

    if (this.gateway.supportsDeliveryReceipt()) {
      this.gateway.onDeliveryReceipt(async (deliveryReceipt) => {
        this.logger.debug("onDeliveryReceipt", { deliveryReceipt });

        const queueKey = this.#deliveryReceiptQueueKey(deliveryReceipt.messageId);

        if (!queueKey) {
          return;
        }

        const outboundMessage = this.#outboundQueue.get(queueKey);

        if (deliveryReceipt.status !== "sent") {
          await this.#notifyMessageStatus(outboundMessage.messageId, deliveryReceipt.status);
        }

        this.#outboundQueue.delete(queueKey);
      });
    }

    this.gateway.onReceived(async (message) => {
      this.logger.debug("onReceived", { message });

      await this.somlengClient.receivedMessage({
        from: message.source,
        to: message.destination,
        body: message.shortMessage,
      });
    });
  }

  #notifyMessageStatus(id, status) {
    this.logger.debug("Notifying message status", {
      connectionName: this.name,
      connectionMode: this.mode,
      messageId: id,
      status,
    });

    return this.somlengClient.notifyMessageStatus({ id, status });
  }

  #messageSendSucceeded(response) {
    if (response.status) {
      return response.status === "sent" || response.status === "delivered";
    }

    return Boolean(response.messageId && response.messageId.toString().length);
  }

  #deliveryReceiptQueueKey(messageId) {
    const stringMessageId = messageId.toString();
    const numericMessageId = parseInt(stringMessageId, 10).toString();

    if (this.#outboundQueue.has(stringMessageId)) {
      return stringMessageId;
    }

    if (this.#outboundQueue.has(numericMessageId)) {
      return numericMessageId;
    }

    return null;
  }

  #sanitizedOptions() {
    const options = { ...this.gateway.config() };

    return Object.fromEntries(
      Object.entries(options).map(([key, value]) => [key, this.#sanitizedOptionValue(key, value)]),
    );
  }

  #sanitizedOptionValue(key, value) {
    if (!this.#shouldMaskOption(key) || typeof value !== "string") {
      return value;
    }

    return `${value.slice(0, 6)}***`;
  }

  #shouldMaskOption(key) {
    const normalizedKey = key.toLowerCase();

    return MASKED_OPTION_KEY_PARTS.some((keyPart) => normalizedKey.includes(keyPart));
  }
}

export default GatewayConnection;
