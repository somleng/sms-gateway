import smpp from "smpp";

class SMPPGateway {
  #onSentCallback;
  #onReceivedCallback;
  #session;
  #reconnectInterval = false;
  #isConnected = false;

  constructor(config) {
    this.host = config.host;
    this.port = config.port;
    this.systemId = config.systemId;
    this.password = config.password;
    this.debug = config.debug;
  }

  async connect() {
    this.#createConnectionSession();
    this.#handleReconnection();
    this.#handleMessageDeliveryReceipt();
  }

  isConnected() {
    return this.#isConnected;
  }

  sendMessage(params) {
    return new Promise((resolve) => {
      this.#session.submit_sm(
        {
          registered_delivery: 1,
          source_addr: params.source,
          destination_addr: params.destination,
          short_message: params.shortMessage,
        },
        (pdu) => {
          resolve({ messageId: pdu.message_id, commandStatus: pdu.command_status });
        }
      );
    });
  }

  onReceived(callback) {
    this.#onReceivedCallback = callback;
  }

  onSent(callback) {
    this.#onSentCallback = callback;
  }

  #handleMessageDeliveryReceipt() {
    this.#session.on("deliver_sm", (pdu) => {
      if (pdu.esm_class === smpp.ESM_CLASS.MC_DELIVERY_RECEIPT) {
        const matches = pdu.short_message.message.match(
          /^id:(?<messageId>\d+)\ssub:(?<sub>\d+)\sdlvrd:(?<dlvrd>\d+)/
        );
        const deliveryReceipt = { messageId: matches.groups.messageId };
        deliveryReceipt.status = Number(matches.groups.dlvrd) > 0 ? "sent" : "failed";
        this.#onSentCallback && this.#onSentCallback(deliveryReceipt);
      } else {
        this.#onReceivedCallback &&
          this.#onReceivedCallback({
            source: pdu.source_addr,
            destination: pdu.destination_addr,
            shortMessage: pdu.short_message.message,
          });
      }
    });
  }

  #createConnectionSession() {
    const smppConfig = {
      url: `smpp://${this.host}:${this.port}`,
      auto_enquire_link_period: 10000,
      debug: this.debug,
    };
    this.#session = smpp.connect(smppConfig, () => {
      this.#session.bind_transceiver(
        { system_id: this.systemId, password: this.password },
        (pdu) => {
          if (pdu.command_status !== 0) {
            throw new Error("Failed to connect to SMPP Server!");
          }
        }
      );
    });
  }

  #handleReconnection() {
    // Keep the program running while the connection dropped
    this.#session.on("error", () => {});
    this.#session.socket.on("readable", () => {
      this.#isConnected = true;

      if (this.#reconnectInterval !== false) {
        clearInterval(this.#reconnectInterval);
        this.#reconnectInterval = false;
      }
    });

    this.#session.socket.on("close", () => {
      this.#isConnected = false;

      if (this.#reconnectInterval === false) {
        this.#reconnectInterval = setInterval(() => {
          this.#session.connect();
          this.#session.resume();
        }, 3000);
      }
    });
  }
}

export default SMPPGateway;
