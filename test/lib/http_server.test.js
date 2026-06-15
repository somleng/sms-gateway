import HTTPServer from "../../lib/http_server/http_server";

describe("HTTPServer", () => {
  it("returns 200 and renders all gateway connections when healthy", () => {
    const server = new HTTPServer({
      port: 0,
      gatewayConnections: [
        {
          isHealthy: () => true,
          status: () => ({
            name: "carrier-a-device-1",
            mode: "smpp",
            somlengConnectionStatus: true,
            gatewayConnectionStatus: true,
            options: {
              host: "smpp-a.example.com",
              port: 2775,
            },
          }),
        },
        {
          isHealthy: () => true,
          status: () => ({
            name: "gateway-1",
            mode: "goip",
            somlengConnectionStatus: true,
            gatewayConnectionStatus: true,
            options: {
              host: "goip.example.com",
              channels: 8,
            },
          }),
        },
      ],
    });

    expect(server.statusCode()).toBe(200);
    expect(server.content()).toContain("carrier-a-device-1");
    expect(server.content()).toContain("gateway-1");
    expect(server.content()).toContain("smpp-a.example.com");
    expect(server.content()).toContain("channels: 8");
  });

  it("returns 500 when any gateway connection is unhealthy", () => {
    const server = new HTTPServer({
      port: 0,
      gatewayConnections: [
        {
          isHealthy: () => true,
          status: () => ({
            name: "carrier-a-device-1",
            mode: "smpp",
            somlengConnectionStatus: true,
            gatewayConnectionStatus: true,
            options: {},
          }),
        },
        {
          isHealthy: () => false,
          status: () => ({
            name: "carrier-b-device-1",
            mode: "smpp",
            somlengConnectionStatus: true,
            gatewayConnectionStatus: false,
            options: {},
          }),
        },
      ],
    });

    expect(server.statusCode()).toBe(500);
    expect(server.content()).toContain("carrier-b-device-1");
    expect(server.content()).toContain("Disconnected");
  });
});
