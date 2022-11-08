import smpp from "smpp";

class SMPPGateway {
  #onReceivedMessageCallback;
  #session;
  #reconnectInterval;

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

  sendMessage(params) {
    return new Promise((resolve) => {
      this.#session.submit_sm(
        { destination_addr: params.destination, short_message: params.short_message },
        (pdu) => {
          resolve({ messageId: pdu.message_id, status: pdu.command_status });
        }
      );
    });
  }

  onReceivedMessage(callback) {
    this.#onReceivedMessageCallback = callback;
  }

  #handleMessageDeliveryReceipt() {
    this.#session.on("deliver_sm", (pdu) => {
      if (pdu.destination_addr.length) {
        console.log("========= Received ===========");
        if (this.#onReceivedMessageCallback) {
          this.#onReceivedMessageCallback(pdu);
        }
      } else {
        console.log("========= Delivered ===========");
        console.log(pdu);
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
      if (this.#reconnectInterval) {
        clearInterval(this.#reconnectInterval);
      }
    });

    this.#session.socket.on("close", () => {
      if (this.#reconnectInterval) {
        clearInterval(this.#reconnectInterval);
      }

      this.#reconnectInterval = setInterval(() => {
        this.#session.connect();
        this.#session.resume();
      }, 3000);
    });
  }
}

export default SMPPGateway;
