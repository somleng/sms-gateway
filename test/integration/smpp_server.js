import smpp from "smpp";

var server = smpp.createServer({
  debug: true,
});

server.listen(2775);
