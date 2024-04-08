import { TestCable } from "../test_helper";
import SomlengClient from "../../lib/somleng_client";

describe(SomlengClient, () => {
  let client;
  let cable;

  beforeEach(async () => {
    cable = new TestCable();
    client = new SomlengClient({ cable: cable });

    await client.subscribe();
  });

  it("handles incoming new messages", async () => {
    const data = {
      id: "id",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "this is a test",
    };

    client.onNewMessage((message) => {
      expect(message).toEqual(data);
    });

    cable.broadcast('{"channel":"SMSMessageChannel"}', data);
  });

  it("notifies delivery receipt", async () => {
    await client.notifyDeliveryReceipt("data");

    expect(cable.outgoing).toEqual([{ action: "sent", payload: "data" }]);
  });

  it("receives a new message", async () => {
    await client.receivedMessage("message");

    expect(cable.outgoing).toEqual([{ action: "received", payload: "message" }]);
  });
});
