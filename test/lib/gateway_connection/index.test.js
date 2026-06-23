import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { jest } from "@jest/globals";
import {
  buildConnectionConfigs,
  buildGatewayConnections,
} from "../../../lib/gateway_connection/index.js";
import { SMPPGateway, DummyGateway, VMGGateway } from "../../../lib/gateways/index.js";
import SomlengClient from "../../../lib/somleng_client.js";

describe("gateway_connection", () => {
  describe("buildConnectionConfigs", () => {
    it("loads connection configs from a file", async () => {
      const tempDir = mkdtempSync(path.join(tmpdir(), "gateway-connection-config-"));
      const configPath = path.join(tempDir, "config.json");

      writeFileSync(
        configPath,
        JSON.stringify({
          "device-1": {
            deviceKey: "device-key-1",
            mode: "smpp",
            options: {
              host: "smpp.example.com",
              port: 2775,
              systemId: "system-id-1",
              password: "password-1",
              flashSmsEncoding: false,
            },
          },
          "device-2": {
            deviceKey: "device-key-2",
            mode: "goip",
            options: {
              host: "goip.example.com",
              port: 2775,
              systemId: "system-id-2",
              password: "password-2",
              channels: 2,
            },
          },
          "device-3": {
            deviceKey: "device-key-3",
            mode: "vmg",
            options: {
              host: "vmg.example.com",
              apiToken: "token-3",
              from: "VMG Promotion",
            },
          },
        }),
      );

      const result = buildConnectionConfigs({
        inlineCommand: {},
        options: { config: configPath },
      });

      expect(result).toEqual([
        {
          name: "device-1",
          deviceKey: "device-key-1",
          mode: "smpp",
          options: {
            host: "smpp.example.com",
            port: 2775,
            systemId: "system-id-1",
            password: "password-1",
            flashSmsEncoding: false,
          },
        },
        {
          name: "device-2",
          deviceKey: "device-key-2",
          mode: "goip",
          options: {
            host: "goip.example.com",
            port: 2775,
            systemId: "system-id-2",
            password: "password-2",
            channels: 2,
          },
        },
        {
          name: "device-3",
          deviceKey: "device-key-3",
          mode: "vmg",
          options: {
            host: "vmg.example.com",
            apiToken: "token-3",
            from: "VMG Promotion",
          },
        },
      ]);
    });

    it("throws when inline config is missing the device key", async () => {
      expect(() =>
        buildConnectionConfigs({ inlineCommand: { name: "smpp" }, options: {} }),
      ).toThrow("Option '-k, --key <value>' is required");
    });

    it("builds an inline config for a supported mode", async () => {
      const result = buildConnectionConfigs({
        inlineCommand: {
          name: "smpp",
          options: {
            smppHost: "smpp.example.com",
            smppPort: 2775,
            smppSystemId: "system-id",
            smppPassword: "password",
            flashSmsEncoding: "latin1",
          },
        },
        options: { key: "device-key" },
      });

      expect(result).toEqual([
        {
          name: "smpp",
          deviceKey: "device-key",
          mode: "smpp",
          options: {
            host: "smpp.example.com",
            port: 2775,
            systemId: "system-id",
            password: "password",
            flashSmsEncoding: "latin1",
          },
        },
      ]);
    });
  });

  describe("buildGatewayConnections", () => {
    it("builds gateway connections with per-connection", async () => {
      const logger = {
        child: jest.fn().mockReturnValue({
          debug: jest.fn(),
          error: jest.fn(),
        }),
      };

      const connectionConfigs = [
        {
          name: "device-1",
          deviceKey: "device-key",
          mode: "smpp",
          options: {
            host: "smpp.example.com",
            port: 2775,
            systemId: "system-id",
            password: "password",
            flashSmsEncoding: "latin1",
          },
        },
        {
          name: "device-2",
          deviceKey: "device-key-2",
          mode: "dummy",
          options: {},
        },
        {
          name: "device-3",
          deviceKey: "device-key-3",
          mode: "vmg",
          options: {
            host: "vmg.example.com",
            apiToken: "token-3",
            from: "VMG Promotion",
          },
        },
      ];

      const result = buildGatewayConnections({
        connectionConfigs,
        domain: "wss://app.example.com",
        logger,
        verbose: true,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: "device-1",
        mode: "smpp",
        deviceKey: "device-key",
        gateway: expect.any(SMPPGateway),
        somlengClient: expect.any(SomlengClient),
      });
      expect(result[1]).toMatchObject({
        name: "device-2",
        mode: "dummy",
        deviceKey: "device-key-2",
        gateway: expect.any(DummyGateway),
        somlengClient: expect.any(SomlengClient),
      });
      expect(result[2]).toMatchObject({
        name: "device-3",
        mode: "vmg",
        deviceKey: "device-key-3",
        gateway: expect.any(VMGGateway),
        somlengClient: expect.any(SomlengClient),
      });
    });
  });
});
