import * as http from "http";

const HTML_CONTENT = `
<!DOCTYPE html>

<head>
  <title>Somleng SMS Gateway</title>
  <meta http-equiv="refresh" content="5">

  <style>
    *,
    html {
      margin: 0;
      padding: 0;
      border: 0;
    }

    html {
      width: 100%;
      height: 100%;
    }

    body {
      width: 100%;
      min-height: 100%;
      font-family: "Trebuchet MS", Helvetica, sans-serif;
      background-color: #f5f5f5;
      color: #222;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      background-color: #fff;
    }

    td, th {
      border: 1px solid #555;
      text-align: left;
      padding: 8px;
      vertical-align: top;
    }

    th {
      background-color: #ddd;
    }

    .container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 20px 40px;
      text-align: center;
    }

    .configuration {
      margin: 30px auto 0;
      text-align: left;
    }

    .configuration h2 {
      margin-bottom: 20px;
    }

    .options {
      white-space: pre-wrap;
      font-family: monospace;
    }
  </style>
</head>

<body>
  <div class="container">
    <h1>Somleng SMS Gateway</h1>

    <div class="configuration">
      <h2>Gateway Connections</h2>
      <table>
        <tr>
          <th width="18%">Name</th>
          <th width="18%">Somleng Status</th>
          <th width="18%">Gateway Status</th>
          <th width="12%">Mode</th>
          <th width="34%">Settings</th>
        </tr>
        {{gateway_connections}}
      </table>
    </div>
  </div>
</body>

</html>
`;

function connectionStatus(isConnected) {
  return isConnected ? "Connected" : "Disconnected";
}

function renderOptions(options) {
  const entries = Object.entries(options);

  return entries.map(([key, value]) => `${key}: ${value}`).join("<br>");
}

class HTTPServer {
  constructor(config) {
    this.port = config.port;
    this.gatewayConnections = config.gatewayConnections;
    this.server = http.createServer(this.#requestListener.bind(this));
  }

  async start() {
    await new Promise((resolve) => {
      this.server.listen(this.port, resolve);
    });

    const address = this.server.address();
    const port = typeof address === "object" && address ? address.port : this.port;

    console.log(`Server is running on http://0.0.0.0:${port}`);
  }

  async stop() {
    await new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  #requestListener(request, response) {
    response.setHeader("Content-Type", "text/html");
    response.writeHead(this.statusCode());
    response.end(this.content());
  }

  statusCode() {
    return this.#isHealthy() ? 200 : 500;
  }

  content() {
    return HTML_CONTENT.replace("{{gateway_connections}}", this.#gatewayConnectionsRows());
  }

  #isHealthy() {
    return this.gatewayConnections.every((gatewayConnection) => gatewayConnection.isHealthy());
  }

  #gatewayConnectionsRows() {
    return this.gatewayConnections
      .map((gatewayConnection) => {
        const status = gatewayConnection.status();

        return `
        <tr>
          <td>${status.name}</td>
          <td>${connectionStatus(status.somlengConnectionStatus)}</td>
          <td>${connectionStatus(status.gatewayConnectionStatus)}</td>
          <td>${status.mode}</td>
          <td class="options">${renderOptions(status.options)}</td>
        </tr>
      `;
      })
      .join("");
  }
}

export default HTTPServer;
