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
  players: [],        // { id, username }
  spyIndex: null,
  hostId: null,
  votes: {},          // { voterId: votedId }
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  // JOIN
  if (content === "!join") {
    if (game.isStarted) return message.reply("Game already started.");
    if (game.players.find(p => p.id === message.author.id)) {
      return message.reply("You already joined.");
    }

    game.players.push({ id: message.author.id, username: message.author.username });

    // Set host if first player
    if (game.players.length === 1) {
      game.hostId = message.author.id;
      message.channel.send(`${message.author.username} joined the game (HOST)`);
    } else {
      message.channel.send(`${message.author.username} joined the game.`);
    }
  }

  // START
  if (content === "!start") {
    if (message.author.id !== game.hostId) {
      return message.reply("Only the host can start the game.");
    }

    if (game.players.length < 3) {
      return message.channel.send("At least 3 players are required.");
    }

    game.isStarted = true;
    game.spyIndex = Math.floor(Math.random() * game.players.length);
    game.votes = {};

    // Send roles privately
    for (let i = 0; i < game.players.length; i++) {
      try {
        const user = await client.users.fetch(game.players[i].id);
        const role = (i === game.spyIndex) ? "**You are the SPY 🕵️‍♂️**" : "**You are a CIVILIAN 👤**";
        await user.send(`Game started!\n${role}`);
      } catch (err) {
        console.error(`Failed to DM ${game.players[i].username}`);
      }
    }

    message.channel.send("✅ Roles have been sent via DM. Let the discussion begin!\nWhen ready, use `!vote @username` to vote who you think is the spy.");
  }

  // VOTE
  if (content.startsWith("!vote")) {
    if (!game.isStarted) return message.reply("Game hasn't started.");
    if (!game.players.find(p => p.id === message.author.id)) {
      return message.reply("You are not in the game.");
    }

    const mention = message.mentions.users.first();
    if (!mention) return message.reply("Please mention a user to vote for.");

    if (!game.players.find(p => p.id === mention.id)) {
      return message.reply("That user is not in the game.");
    }

    game.votes[message.author.id] = mention.id;
    message.channel.send(`${message.author.username} voted for ${mention.username}`);

    // Check if all players voted
    if (Object.keys(game.votes).length === game.players.length) {
      const voteCounts = {};
      for (const voted of Object.values(game.votes)) {
        voteCounts[voted] = (voteCounts[voted] || 0) + 1;
      }

      // Find user with most votes
      const maxVotes = Math.max(...Object.values(voteCounts));
      const suspects = Object.entries(voteCounts)
        .filter(([id, count]) => count === maxVotes)
        .map(([id]) => id);

      let resultMessage = "";

      if (suspects.length === 1) {
        const votedId = suspects[0];
        const votedPlayer = game.players.find(p => p.id === votedId);
        const isSpy = (game.players[game.spyIndex].id === votedId);

        resultMessage += `🔍 ${votedPlayer.username} got the most votes.\n`;
        resultMessage += isSpy ? `✅ They were the SPY! Civilians win! 🎉` : `❌ They were NOT the spy! The SPY wins! 🕵️‍♂️`;
      } else {
        resultMessage = "🤷 It's a tie! Nobody was voted out.\n🕵️‍♂️ The SPY wins by confusion!";
      }

      // Send result and reset
      message.channel.send(resultMessage);
      resetGame();
    }
  }

  // STATUS
  if (content === "!status") {
    if (!game.players.length) return message.channel.send("No players joined yet.");
    let list = game.players.map(p => `${p.username}${p.id === game.hostId ? " (host)" : ""}`).join(", ");
    return message.channel.send(`Players: ${list}`);
  }

  // RESET
  if (content === "!reset") {
    if (message.author.id !== game.hostId) return message.reply("Only the host can reset the game.");
    resetGame();
    message.channel.send("Game has been reset.");
  }
});

function resetGame() {
  game = {
    isStarted: false,
    players: [],
    spyIndex: null,
    hostId: null,
    votes: {}
  };
}

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
