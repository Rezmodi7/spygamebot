const express = require("express");
const server = express();

server.all("/", (req, res) => {
  res.send("Bot is alive!");
});

function keepAlive() {
  server.listen(3000, () => {
    console.log("✅ KeepAlive server running.");
  });
}

module.exports = keepAlive();
