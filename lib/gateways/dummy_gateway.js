import { setTimeout } from "timers/promises";

class DummyGateway {
  #onReceivedMessageCallback;

  constructor(config) {
    this.host = config.host;
  }

  async connect() {
    await setTimeout(1000);
    console.log("DummyGateway.connect() was called");
  }

  async sendMessage(channelId, params) {
    await setTimeout(1000);
    console.log(`DummyGateway.sendMessage(${channelId}, ${JSON.stringify(params)}) was called`);

    return { messageId: 1, status: 0 };
  }
}

export default DummyGateway;
