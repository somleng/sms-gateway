const HOSTNAME_PATTERN =
  /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;
const BLOCKED_HOSTS = new Set(["localhost", "169.254.169.254"]);

function isAllowedHost(host) {
  return (
    typeof host === "string" &&
    HOSTNAME_PATTERN.test(host) &&
    !BLOCKED_HOSTS.has(host.toLowerCase())
  );
}

class VMGGateway {
  constructor(config) {
    this.host = config.host;
    this.apiToken = config.apiToken;
    this.from = config.from;
    this.debug = config.debug;
  }

  config() {
    return {
      host: this.host,
      apiToken: this.apiToken,
      from: this.from,
    };
  }

  async connect() {
    return true;
  }

  async disconnect() {
    return true;
  }

  isConnected() {
    return true;
  }

  supportsDeliveryReceipt() {
    return false;
  }

  onReceived() {
    return true;
  }

  async sendMessage(params) {
    try {
      if (!isAllowedHost(this.host)) {
        return { status: "failed" };
      }

      const response = await fetch(`https://${this.host}/api/ott/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: this.apiToken,
        },
        body: JSON.stringify({
          messages: [
            {
              to: params.destination,
              requestID: params.messageId,
              scheduled: "",
              templateId: "1_2",
              templateData: {
                txt: params.shortMessage,
              },
            },
          ],
          serviceType: 2,
          type: 1,
          from: this.from,
        }),
      });

      if (!response.ok) {
        return { status: "failed" };
      }

      const payload = await response.json();

      return {
        status: payload.errorCode === "000" ? "sent" : "failed",
      };
    } catch {
      return { status: "failed" };
    }
  }
}

export default VMGGateway;
