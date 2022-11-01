import smpp from "smpp";

class SMPPGateway {
  constructor(config) {
    this.host = config.host;
    this.port = config.port;
    this.systemId = config.systemId;
    this.password = config.password;
    this.debug = config.debug;
  }

  async connect() {
    const smppConfig = {
      url: `smpp://${this.host}:${this.port}`,
      auto_enquire_link_period: 10000,
      debug: this.debug,
    };
    this._session = smpp.connect(smppConfig, () => {
      const smppCredentials = { system_id: this.systemId, password: this.password };
      this._session.bind_transceiver(smppCredentials, function (pdu) {
        if (pdu.command_status !== 0) {
          throw new Error("Failed to connect to SMPP Server!");
        }
      });

      this._session.on("deliver_sm", function (pdu) {
        if (pdu.destination_addr.length) {
          console.log("========= Received ===========");
        } else {
          console.log("========= Delivered ===========");
        }

        console.log(pdu);
      });
    });
  }

  async sendMessage(params) {
    return new Promise((resolve) => {
      this._session.submit_sm(
        { destination_addr: params.destination, short_message: params.short_message },
        (pdu) => {
          resolve({ messageId: pdu.message_id, status: pdu.command_status });
        }
      );
    });
  }
}

export default SMPPGateway;
