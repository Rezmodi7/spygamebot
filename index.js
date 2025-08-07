require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("./keepalive.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

let game = {
  isStarted: false,
  players: [],
  spyIndex: null
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (content === "!join") {
    if (game.isStarted) {
      return message.reply("Game already started.");
    }
    if (game.players.find(p => p.id === message.author.id)) {
      return message.reply("You already joined.");
    }
    game.players.push({ id: message.author.id, username: message.author.username });
    return message.channel.send(`${message.author.username} joined the game.`);
  }

  if (content === "!start") {
    if (game.players.length < 3) {
      return message.channel.send("At least 3 players needed.");
    }
    game.isStarted = true;
    game.spyIndex = Math.floor(Math.random() * game.players.length);

    for (let i = 0; i < game.players.length; i++) {
      try {
        const user = await client.users.fetch(game.players[i].id);
        const role = i === game.spyIndex ? "You are the **SPY** 🕵️‍♂️" : "You are a **CIVILIAN** 👤";
        await user.send(`Game Started!\n${role}`);
      } catch (err) {
        console.error("Failed to DM user:", err);
      }
    }

    message.channel.send("Roles have been sent! Check your DMs.");
  }

  if (content === "!status") {
    if (!game.players.length) return message.channel.send("No players have joined.");
    let list = game.players.map(p => p.username).join(", ");
    return message.channel.send(`Players: ${list}`);
  }

  if (content === "!reset") {
    game = {
      isStarted: false,
      players: [],
      spyIndex: null
    };
    message.channel.send("Game has been reset.");
  }
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
