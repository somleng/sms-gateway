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
    client.onNewMessage((message) => {
      expect(message).toEqual("message-data");
    });

    cable.broadcast('{"channel":"SMSMessageChannel"}', "message-data");
  });
});
