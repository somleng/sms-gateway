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
      height: 100%;
      position: relative;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    td, th {
      border: 1px solid #555;
      text-align: left;
      padding: 8px;
    }

    th {
      background-color: #ddd;
    }

    .center {
      width: 100%;
      height: 50%;
      margin: 0;
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -20%);
      font-family: "Trebuchet MS", Helvetica, sans-serif;
      text-align: center;
    }

    .configuration {
      margin: auto;
      width: 30%;
    }

    .configuration h2 {
      margin: 20px;
    }
  </style>
</head>

<body>
  <div class="center">
    <h1>Somleng SMS Gateway</h1>

    <div class="configuration">
      <h2>Somleng Platform</h2>
      <table>
        <tr>
          <th width="40%">Parameter</th>
          <th width="60%">Value</th>
        </tr>
        <tr>
          <td>connectionStatus</td>
          <td>{{somleng_connection_status}}</td>
        </tr>
      </table>

      <h2>Gateway Parameters</h2>
      <table>
        <tr>
          <th width="40%">Parameter</th>
          <th width="60%">Value</th>
        </tr>
        {{gateway_parameters}}
      </table>
    </div>
  </div>
</body>

</html>
`;

class HTTPServer {
  constructor(config) {
    this.port = config.port;
    this.server = http.createServer(this.#requestListener.bind(this));

    this.somlengClient = config.somlengClient;
    this.gateway = config.gateway;
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Server is running on http://0.0.0.0:${this.port}`);
    });
  }

  #requestListener(request, response) {
    response.setHeader("Content-Type", "text/html");
    let content = HTML_CONTENT;

    if (this.gateway.isConnected() && this.somlengClient.isConnected()) {
      response.writeHead(200);
    } else {
      response.writeHead(500);
    }

    content = content.replace(
      "{{somleng_connection_status}}",
      this.#connectionStatus(this.somlengClient.isConnected()),
    );
    content = content.replace("{{gateway_parameters}}", this.#gatewayParameters());

    response.end(content);
  }

  #connectionStatus(isConnected) {
    return isConnected ? "Connected" : "Disconnected";
  }

  #gatewayParameters() {
    let content = `
      <tr>
        <td>connectionStatus</td>
        <td>${this.#connectionStatus(this.gateway.isConnected())}</td>
      </tr>`;

    for (const [key, value] of Object.entries(this.gateway.config())) {
      content += `
        <tr>
          <td>${key}</td>
          <td>${value}</td>
        </tr>
      `;
    }

    return content;
  }
}

export default HTTPServer;
