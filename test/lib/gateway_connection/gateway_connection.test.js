import { jest } from "@jest/globals";
import GatewayConnection from "../../../lib/gateway_connection/gateway_connection";

function buildSubject({
  gatewayConnected = true,
  somlengConnected = true,
  gatewaySendResponse = { messageId: "abc123" },
  gatewayConfig = {
    host: "smpp.example.com",
    port: 2775,
    password: "secret",
  },
} = {}) {
  const handlers = {};

  const gateway = {
    connect: jest.fn().mockResolvedValue(),
    isConnected: jest.fn(() => gatewayConnected),
    sendMessage: jest.fn().mockResolvedValue(gatewaySendResponse),
    config: jest.fn(() => gatewayConfig),
    onDeliveryReceipt: jest.fn((callback) => {
      handlers.onDeliveryReceipt = callback;
    }),
    onReceived: jest.fn((callback) => {
      handlers.onReceived = callback;
    }),
  };
  const somlengClient = {
    subscribe: jest.fn().mockResolvedValue(),
    isConnected: jest.fn(() => somlengConnected),
    onNewMessage: jest.fn((callback) => {
      handlers.onNewMessage = callback;
    }),
    notifyMessageStatus: jest.fn().mockResolvedValue(),
    receivedMessage: jest.fn().mockResolvedValue(),
  };
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  const connection = new GatewayConnection({
    name: "device-1",
    mode: "smpp",
    deviceKey: "device-key",
    gateway,
    somlengClient,
    logger,
  });

  return {
    connection,
    gateway,
    somlengClient,
    logger,
    handlers,
  };
}

describe("GatewayConnection", () => {
  it("connects the gateway and subscribes the somleng client", async () => {
    const { connection, gateway, somlengClient } = buildSubject();

    await connection.connect();

    expect(gateway.connect).toHaveBeenCalled();
    expect(somlengClient.subscribe).toHaveBeenCalled();
  });

  it("reports health from both dependencies", () => {
    const healthySubject = buildSubject();
    const unhealthySubject = buildSubject({ somlengConnected: false });

    expect(healthySubject.connection.isHealthy()).toBe(true);
    expect(unhealthySubject.connection.isHealthy()).toBe(false);
  });

  it("disconnects both the gateway and somleng client", async () => {
    const { connection, gateway, somlengClient } = buildSubject();
    gateway.disconnect = jest.fn().mockResolvedValue();
    somlengClient.disconnect = jest.fn().mockResolvedValue();

    await connection.disconnect();

    expect(gateway.disconnect).toHaveBeenCalled();
    expect(somlengClient.disconnect).toHaveBeenCalled();
  });

  it("returns status with sanitized gateway options", () => {
    const { connection } = buildSubject({
      gatewayConfig: { host: "smpp.example.com", port: 2775, password: "secret" },
    });

    expect(connection.status()).toEqual({
      name: "device-1",
      mode: "smpp",
      somlengConnectionStatus: true,
      gatewayConnectionStatus: true,
      options: {
        host: "smpp.example.com",
        port: 2775,
      },
    });
  });

  it("marks outbound messages as sent when the gateway returns a message id", async () => {
    const { gateway, somlengClient, handlers } = buildSubject();
    const message = {
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    };

    await handlers.onNewMessage(message);

    expect(gateway.sendMessage).toHaveBeenCalledWith({
      channel: 1,
      source: "85510888888",
      destination: "85510777777",
      shortMessage: "hello",
    });
    expect(somlengClient.notifyMessageStatus).toHaveBeenCalledWith({
      id: "message-1",
      status: "sent",
    });
  });

  it("marks outbound messages as failed when the gateway does not return a message id", async () => {
    const { somlengClient, handlers } = buildSubject({
      gatewaySendResponse: { messageId: "" },
    });

    await handlers.onNewMessage({
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });

    expect(somlengClient.notifyMessageStatus).toHaveBeenCalledWith({
      id: "message-1",
      status: "failed",
    });
  });

  it("logs and marks outbound messages as failed when the gateway send raises", async () => {
    const { gateway, somlengClient, logger, handlers } = buildSubject();
    gateway.sendMessage.mockRejectedValue(new Error("boom"));

    await handlers.onNewMessage({
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });

    expect(logger.error).toHaveBeenCalledWith("Failed to send message", {
      error: "boom",
      messageId: "message-1",
    });
    expect(somlengClient.notifyMessageStatus).toHaveBeenCalledWith({
      id: "message-1",
      status: "failed",
    });
  });

  it("does not notify again when a sent delivery receipt is received", async () => {
    const { somlengClient, handlers } = buildSubject();

    await handlers.onNewMessage({
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });

    somlengClient.notifyMessageStatus.mockClear();

    await handlers.onDeliveryReceipt({
      messageId: "abc123",
      status: "sent",
    });

    expect(somlengClient.notifyMessageStatus).not.toHaveBeenCalled();
  });

  it("forwards non-sent delivery receipts to somleng", async () => {
    const { somlengClient, handlers } = buildSubject();

    await handlers.onNewMessage({
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });

    somlengClient.notifyMessageStatus.mockClear();

    await handlers.onDeliveryReceipt({
      messageId: "abc123",
      status: "delivered",
    });

    expect(somlengClient.notifyMessageStatus).toHaveBeenCalledWith({
      id: "message-1",
      status: "delivered",
    });
  });

  it("matches delivery receipts using normalized numeric message ids", async () => {
    const { somlengClient, handlers } = buildSubject({
      gatewaySendResponse: { messageId: "123" },
    });

    await handlers.onNewMessage({
      id: "message-1",
      channel: 1,
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });

    somlengClient.notifyMessageStatus.mockClear();

    await handlers.onDeliveryReceipt({
      messageId: "000123",
      status: "failed",
    });

    expect(somlengClient.notifyMessageStatus).toHaveBeenCalledWith({
      id: "message-1",
      status: "failed",
    });
  });

  it("forwards inbound gateway messages to somleng", async () => {
    const { somlengClient, handlers } = buildSubject();

    await handlers.onReceived({
      source: "85510888888",
      destination: "85510777777",
      shortMessage: "hello",
    });

    expect(somlengClient.receivedMessage).toHaveBeenCalledWith({
      from: "85510888888",
      to: "85510777777",
      body: "hello",
    });
  });
});
