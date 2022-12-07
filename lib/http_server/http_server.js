import * as http from "http";

const HTML_CONTENT = `
<!DOCTYPE html>

<head>
    <title>Somleng SMS Gateway</title>
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

        .connection-status {
          margin-top: 30px;
          color: white;
        }

        .connection-status--connected {
          background-color: green;
          padding: 15px;
        }

        .connection-status--disconnected {
          background-color: red;
          padding: 15px;
        }

    </style>
</head>

<body>
    <div class="center">
        <h1>Somleng SMS Gateway</h1>
        <p class="connection-status">{{content}}</p>
    </div>
</body>

</html>
`;

class HTTPServer {
  constructor(config) {
    this.port = config.port;
    this.server = http.createServer(this.#requestListener.bind(this));

    this.gateway = config.gateway;
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Server is running on http://0.0.0.0:${this.port}`);
    });
  }

  #requestListener(request, response) {
    response.setHeader("Content-Type", "text/html");
    response.writeHead(200);
    let content = "";

    if (this.gateway.isConnected()) {
      content = `<span class="connection-status--connected">Connected</span>`;
    } else {
      content = `<span class="connection-status--disconnected">Disconnected</span>`;
    }

    response.end(HTML_CONTENT.replace("{{content}}", content));
  }
}

export default HTTPServer;
