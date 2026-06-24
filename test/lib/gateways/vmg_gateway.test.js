import { jest } from "@jest/globals";
import VMGGateway from "../../../lib/gateways/vmg_gateway.js";

describe("VMGGateway", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function buildSubject(config = {}) {
    return new VMGGateway({
      host: "vmg.example.com",
      apiToken: "secret-token",
      from: "VMG Promotion",
      ...config,
    });
  }

  it("does not support delivery receipts", () => {
    const gateway = buildSubject();

    expect(gateway.supportsDeliveryReceipt()).toBe(false);
  });

  it("sends a message to VMG", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ errorCode: "000" }),
    });

    await gateway.sendMessage({
      messageId: "message-1",
      destination: "+959252380344",
      shortMessage: "Test 2",
    });

    expect(global.fetch).toHaveBeenCalledWith("https://vmg.example.com/api/ott/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: "secret-token",
      },
      body: JSON.stringify({
        messages: [
          {
            to: "+959252380344",
            requestID: "message-1",
            scheduled: "",
            templateId: "1_2",
            templateData: {
              txt: "Test 2",
            },
          },
        ],
        serviceType: 2,
        type: 1,
        from: "VMG Promotion",
      }),
    });
  });

  it("returns sent when the top-level error code is 000", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ errorCode: "000" }),
    });

    await expect(
      gateway.sendMessage({
        messageId: "message-1",
        destination: "+959252380344",
        shortMessage: "Test 2",
      }),
    ).resolves.toEqual({ status: "sent" });
  });

  it("returns failed when the top-level error code is not 000", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ errorCode: "001" }),
    });

    await expect(
      gateway.sendMessage({
        messageId: "message-1",
        destination: "+959252380344",
        shortMessage: "Test 2",
      }),
    ).resolves.toEqual({ status: "failed" });
  });

  it("returns failed on non-success HTTP responses", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    });

    await expect(
      gateway.sendMessage({
        messageId: "message-1",
        destination: "+959252380344",
        shortMessage: "Test 2",
      }),
    ).resolves.toEqual({ status: "failed" });
  });

  it("returns failed when the response body is invalid JSON", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
    });

    await expect(
      gateway.sendMessage({
        messageId: "message-1",
        destination: "+959252380344",
        shortMessage: "Test 2",
      }),
    ).resolves.toEqual({ status: "failed" });
  });

  it("returns failed when the HTTP request raises", async () => {
    const gateway = buildSubject();
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      gateway.sendMessage({
        messageId: "message-1",
        destination: "+959252380344",
        shortMessage: "Test 2",
      }),
    ).resolves.toEqual({ status: "failed" });
  });
});
