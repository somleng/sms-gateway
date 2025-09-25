import * as Sentry from "@sentry/node";
import smpp from "smpp";
import {
  SMPPDeliveryReceipt,
  InvalidMessageFormatError,
  UnsupportedDeliveryStatusError,
} from "./smpp_delivery_receipt.js";

const GSM_FLASH_ENCODING = 0x10;
const UCS2_FLASH_ENCODING = 0x18;

class SMPPGateway {
  #onDeliveryReceiptCallback;
  #onReceivedCallback;
  #session;
  #reconnectInterval = false;
  #isConnected = false;

  constructor(config) {
    this.host = config.host;
    this.port = config.port;
    this.systemId = config.systemId;
    this.password = config.password;
    this.flashSmsEncoding = config.flashSmsEncoding;
    this.debug = config.debug;
  }

  config() {
    return {
      host: this.host,
      port: this.port,
      systemId: this.systemId,
      password: this.password,
    };
  }

  async connect() {
    this.#createConnectionSession();
    this.#handleReconnection();
    this.#handleDeliverSM();
  }

  isConnected() {
    return this.#isConnected;
  }

  sendMessage(params) {
    return new Promise((resolve) => {
      const submitSmParams = {
        registered_delivery: 1,
        source_addr: params.source,
        destination_addr: params.destination,
      };

      if (this.flashSmsEncoding) {
        const encoding = smpp.encodings.detect(params.shortMessage);

        switch (encoding) {
          case "ASCII":
            submitSmParams.short_message = smpp.encodings.ASCII.encode(params.shortMessage);
            submitSmParams.data_coding = GSM_FLASH_ENCODING;
            break;
          case "LATIN1":
            submitSmParams.short_message = smpp.encodings.LATIN1.encode(params.shortMessage);
            submitSmParams.data_coding = GSM_FLASH_ENCODING;
            break;
          default:
            submitSmParams.short_message = smpp.encodings.UCS2.encode(params.shortMessage);
            submitSmParams.data_coding = UCS2_FLASH_ENCODING;
        }
      } else {
        submitSmParams.short_message = params.shortMessage;
      }

      this.#session.submit_sm(submitSmParams, (pdu) => {
        resolve({ messageId: pdu.message_id, commandStatus: pdu.command_status });
      });
    });
  }

  onReceived(callback) {
    this.#onReceivedCallback = callback;
  }

  onDeliveryReceipt(callback) {
    this.#onDeliveryReceiptCallback = callback;
  }

  #handleDeliverSM() {
    this.#session.on("deliver_sm", (pdu) => {
      // Send deliver_sm_resp
      this.#session.send(pdu.response());

      const rawMessage = pdu.short_message.message;

      if (pdu.esm_class === smpp.ESM_CLASS.MC_DELIVERY_RECEIPT) {
        try {
          const deliveryReceipt = SMPPDeliveryReceipt.parse(rawMessage);
          this.#onDeliveryReceiptCallback && this.#onDeliveryReceiptCallback(deliveryReceipt);
        } catch (error) {
          if (
            error instanceof InvalidMessageFormatError ||
            error instanceof UnsupportedDeliveryStatusError
          ) {
            Sentry.captureException(error, { extra: { rawMessage: rawMessage } });
            console.log("Unsupported delivery receipt message: ", rawMessage);
          }
        }
      } else {
        this.#onReceivedCallback &&
          this.#onReceivedCallback({
            source: pdu.source_addr,
            destination: pdu.destination_addr,
            shortMessage: rawMessage,
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
        },
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
