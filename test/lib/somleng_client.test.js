import { jest } from "@jest/globals";
import { TestCable } from "../test_helper";
import SomlengClient from "../../lib/somleng_client";
import { createLogger, transports } from "winston";

describe(SomlengClient, () => {
  const messageChannelIdentifier = '{"channel":"SMSMessageChannel"}';
  let client;
  let cable;

  const logger = createLogger({
    transports: [new transports.Console({ silent: true })],
  });

  beforeEach(async () => {
    cable = new TestCable();
    client = new SomlengClient({ cable, logger });

    await client.subscribe();
  });

  it("confirms message send requests", async () => {
    client.onNewMessage(() => {});

    cable.broadcast(messageChannelIdentifier, {
      type: "message_send_request",
      message_id: "message-id-1",
    });

    expect(cable.outgoing).toEqual([
      {
        action: "message_send_requested",
        payload: { id: "message-id-1" },
      },
    ]);
  });

  it("handles confirmed new messages", async () => {
    const callback = jest.fn();
    const message = {
      id: "id",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "this is a test",
    };

    client.onNewMessage(callback);

    cable.broadcast(messageChannelIdentifier, {
      type: "message_send_request_confirmed",
      message,
    });

    expect(callback).toHaveBeenCalledWith(message);
  });

  it("ignores unknown message types", async () => {
    const callback = jest.fn();

    client.onNewMessage(callback);

    expect(() => {
      cable.broadcast(messageChannelIdentifier, {
        type: "unknown",
        message: { id: "ignored" },
      });
    }).not.toThrow();

    expect(callback).not.toHaveBeenCalled();
    expect(cable.outgoing).toEqual([]);
  });

  it("notifies delivery receipt", async () => {
    await client.notifyMessageStatus("data");

    expect(cable.outgoing).toEqual([{ action: "sent", payload: "data" }]);
  });

  it("receives a new message", async () => {
    await client.receivedMessage("message");

    expect(cable.outgoing).toEqual([{ action: "received", payload: "message" }]);
  });

  it("disconnects the cable subscriptions", async () => {
    const disconnectSpy = jest.spyOn(cable, "disconnect");

    await client.disconnect();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(cable.channels).toEqual({});
  });
});
