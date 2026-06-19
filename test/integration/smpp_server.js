import smpp from "smpp";

var server = smpp.createServer(
  {
    debug: true,
  },
  function (session) {
    session.on("bind_transceiver", function (pdu) {
      session.send(pdu.response());
    });
  },
);

server.listen(2775);
