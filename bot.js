// YOU NEED TO INSTALL A NPM PACKAGE TO USE THIS ADDON!!!
// Installation:
// 1. run npm install eris
// 2. Get your discord bot: https://www.ionos.com/digitalguide/server/know-how/creating-discord-bot/
// 3. Put your bot token as BOT_TOKEN in .env DON'T SHARE YOUR BOT TOKEN!!!
// 4. Add your bot to your server Guide:

// Eris docs: https://abal.moe/Eris/docs/0.17.2/getting-started

// Config
// To get Discord IDs, enable developer mode. Guide: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID

const CONFIG = {
    themeColor: 0xFFFFFF, // Theme color HEX selector: https://www.w3schools.com/colors/colors_picker.asp
    logsChannelId: "1204484183813005323", // The ID of the logs channel
    gameImageLink: "https://zyrafaq.com/assets/round.png", // Link to your game image.
    chatChannelId: "1208734555784351754", // The ID of in-game to Discord channel
    botChannelId: "1204503267405471744", // The ID of the channel with the bot mention Easter egg
    devRoleId: "1204504807763738706", // The developer role ID
    enableBotPingEasterEgg: false, // Whether to enable the bot ping Easter egg
    mainServerId: "872757476829831178" // The ID of your server
};

global.mainServerId = CONFIG.mainServerId;
// For any more help, DM zyrafaq on the Discord server: https://discord.gg/bZxyTVUP5g
// GitHub repository: https://github.com/zyrafaq/arras-bot-addon

const Eris = require("eris");
const {closeArena} = require("../../gamemodes/closeArena");
const { combineStats, menu, addAura, makeDeco, LayeredBoss } = require('../facilitators.js');
const { base, gunCalcNames, basePolygonDamage, basePolygonHealth, dfltskl, statnames } = require('../constants.js');
const g = require('../gunvals.js');
const Constants = Eris.Constants;
global.bot = new Eris(process.env.BOT_TOKEN, {
    intents: [
        "all"
    ],
});

function convertColor(color) {
    let convertedColor
    if (color === "green") convertedColor = 5763719; // Green color
    else if (color === "red") convertedColor = 16711680; // Red color
    else if (color === "yellow") convertedColor = 16776960; // Yellow color
    else convertedColor = color;
    return convertedColor
}
function getMembersFromRoleFromId(id) {
    let guild = bot.guilds.get(mainServerId);
    let members = guild.members;
    let membersWithRole = [];
    for (let [_, member] of members) {
        if (member.roles.includes(id)) membersWithRole.push(member.id);
    }
    return membersWithRole;
}

function updateStatus() {
    if (global.arenaClosed) return;
    if (sockets.clients.length > 1 || sockets.clients.length === 0) {
        bot.editStatus("online", { name: `with ${sockets.clients.length} players!`, type: 0 });
    }
    else bot.editStatus("online", { name: `with ${sockets.clients.length} player!`, type: 0 });
}

function initializeCommands() {
    bot.createCommand({
        name: "clear",
        description: "Kills most of entities to reduce lag.",
    });
    bot.createCommand({
        name: "purge",
        description: "Kills all entities.",
    });
    bot.createCommand({
        name: "ping",
        description: "Pings the bot.",
    });
    bot.createCommand({
        name: "eval",
        description: "Evaluate your code via the Discord bot.",
        options: [
            {
                name: "code",
                description: "The code you want to evaluate",
                type: 3,
                required: true
            }
        ]
    });
    bot.createCommand({
        name: "broadcast",
        description: "Broadcast your message using the Discord bot.",
        options: [
            {
                name: "message",
                description: "The message you want to broadcast",
                type: 3,
                required: true
            }
        ]
    });
    bot.createCommand({
        name: "players",
        description: "Shows the list of connected players.",
    });
    bot.createCommand({
        name: "restart",
        description: "Closes arena and restarts server.",
    });
}
function generateRequestedBy(user) {
    return "requested by: " + user.username + " (" + user.id + ")";
}

function generateSuccessMessage(title = "", description = "", name = "Not specified", value = "Not specified", color = "green", footer = "", thumbnailLink = CONFIG.gameImageLink) {
    let output = {
        embed: {
            title: title.toString(),
            description: description.toString(),
            color: convertColor(color),
            fields: [
                {
                    name: name.toString(),
                    value: value.toString(),
                },
            ],
            thumbnail: {
                url: thumbnailLink.toString(),
            },
            footer: { text: footer.toString() },
        }
    };
    return output;
}

function generateErrorMessage(commandName = "Not specified", footer = "", color = "red", thumbnailLink = CONFIG.gameImageLink) {
    let output = {
        embed: {
            title: `${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command`,
            description: "",
            color: convertColor(color),
            fields: [
                {
                    name: "Warning",
                    value: "You are not permitted to perform this action.",
                },
            ],
            thumbnail: {
                url: thumbnailLink.toString(),
            },
            footer: { text: footer.toString() },
        }
    };
    return output;
}
function log(color = "green", title = "Not specified", description = "Not specified", footer = "") {
    let convertedColor = convertColor(color);
    bot.createMessage(CONFIG.logsChannelId, {
        embed: {
            title: title.toString(),
            description: description.toString(),
            color: convertedColor,
            fields: [],
            thumbnail: {
                url: CONFIG.gameImageLink,
            },
            footer: { text: footer.toString() },
        },
    });
}

bot.on("ready", async () => { // When the bot is ready
    console.log("Bot ready! Logged in as: " + bot.user.username);
    const commands = await bot.getCommands();
    global.developers = getMembersFromRoleFromId(CONFIG.devRoleId);
    global.owner = bot.guilds.get(CONFIG.mainServerId).ownerID;
    initializeCommands();
    updateStatus();
    log("green", "Server initialized", "Bot is ready for use")
});


bot.on("messageCreate", (msg) => {
    if (msg.channel.id === CONFIG.chatChannelId && msg.author.id !== bot.user.id) {
        let message = msg.content;
        if (message.length > 100) {
            bot.createMessage(msg.channel.id, {
                embed: {
                    title: "Broadcast command",
                    description: "",
                    color: 16776960,
                    fields: [
                        {
                            name: `Warning`,
                            value: `Overly-long message !`,
                        },
                    ],
                    thumbnail: {
                        url: CONFIG.gameImageLink,
                    },
                    footer: generateRequestedBy(msg.author),
                },
            });
        } else {
            sockets.broadcast(`${msg.author.username} says on Discord: ${message}`);
        }
    }
    if (msg.channel.id === CONFIG.botChannelId && msg.content.startsWith(bot.user.mention) && CONFIG.enableBotPingEasterEgg) {
        let phrases = ["I've been pinged again.",
            "Why the frequent pings?",
            "Another ping. Seriously, why are you bothering me?",
            "Received your ping. What's the deal? Can we end this constant interruption?",
            "What's with the repeated pings? This is getting annoying.",
            "You just pinged me. Why? This has to stop. No more pings.",
            "Yet another ping. What's the reason? Consider this a request to stop.",
            "Why am I being pinged again? Enough is enough. Please refrain from further pings.",
            "Once again, a ping. What's going on? Stop it.",
            "Another ping from you. What's the purpose? Let's put an end to this, okay ?",
            "<:peepoPing:1193981184288510024>",
            "Ping me again and see what happens. Go ahead.",
            "Can you stop with the pings ?",
            "Seriously ? Don't you have other things to do ?",
            "Don't you have other things to do ?",
            "Alright, here is your reward for pinging for a total of 69 times: ||[Bot Pinger Token](<https://www.youtube.com/watch?v=iik25wqIuFo>)||",
            "Go touch grass or watch some youtube, idk but enough with the mentions!",
            "You think this is funny to constantly ping me, huh?",
            "Okay i will make it clear:\nStop\nPinging\nME!\nOkay? Thanks",
            "look, i do a barrel roll !\n`._.   :|    .-.    |:    ._.`\n\nCool right? Now STOP PINGING ME !",
        ];
        bot.createMessage(msg.channel.id, {
            content: phrases[Math.floor(Math.random() * phrases.length)],
            messageReference: { messageID: msg.id },
        });
    }
});


bot.on("interactionCreate", (interaction) => {
    const user = interaction.user ? interaction.user : interaction.member;

    if (interaction instanceof Eris.CommandInteraction) {
        switch (interaction.data.name) {
            case "clear":
                if (developers.includes(user.id)) {
                    for (let e of entities) {
                        if (e.type !== "wall" && e.type !== "tank" && !e.isPlayer && !e.godmode) {
                            e.invuln = false;
                            e.protection = false;
                            e.kill();
                        }
                    }
                    interaction.createMessage(generateSuccessMessage("Clear command", "", "Success", "Some of the entities have been killed!", "green", generateRequestedBy(user)));
                } else {
                    interaction.createMessage(generateErrorMessage("Clear", generateRequestedBy(user)));
                }
                break;
            case "purge":
                if (developers.includes(user.id)) {
                    for (let e of entities) {
                        if (e.type !== "wall" && !e.godmode) {
                            e.invuln = false;
                            e.protection = false;
                            e.kill();
                        }
                    }
                    interaction.createMessage(generateSuccessMessage("Purge command", "", "Success", "All entities have been killed.", "green", generateRequestedBy(user)));
                } else {
                    interaction.createMessage(generateErrorMessage("Purge", generateRequestedBy(user)));
                }
                break;
            case "broadcast":
                if (developers.includes(user.id)) {
                    let message = interaction.data.options[0].value;
                    sockets.broadcast(message);
                    interaction.createMessage(generateSuccessMessage("Broadcast command", "", "Success", "Broadcasted!", "green", generateRequestedBy(user)));
                } else {
                    interaction.createMessage(generateErrorMessage("Broadcast", generateRequestedBy(user)));
                }
                break;
            case "eval":
                if (owner === user.id) {
                    let command = interaction.data.options[0].value;
                    console.log("new eval: ", command);
                    try {
                        let result = eval(command);
                        let stringResult = String(result);
                        interaction.createMessage(generateSuccessMessage("Eval command", "✅ Successful evaluation \n\n Output: \"" + stringResult + "\"", "", "", "green", generateRequestedBy(user)));
                        log("green", "Dangerous eval detected", `Evaluated: ${command} \n Result: ${stringResult}`, generateRequestedBy(user));
                    } catch (err) {
                        interaction.createMessage({
                            embed: {
                                title: "Eval Command",
                                description: "",
                                color: 16776960,
                                fields: [{
                                    name: `⚠️ An error occurred.`,
                                    value: `${err.toString()}`,
                                }, ],
                                thumbnail: {
                                    url: CONFIG.gameImageLink,
                                },
                                footer: { text: generateRequestedBy(user) },
                            },
                        });
                    }
                }
                else {
                    interaction.createMessage(generateErrorMessage("Eval", generateRequestedBy(user)));
                }
                break;
            case "ping":
                interaction.createMessage(generateSuccessMessage("Ping command", "", "Success", "Pong!", "green", generateRequestedBy(user)));
                break;
            case "players":
                list = sockets.clients
                    .map((c) => {
                        let Name =
                            c.player.body == null ? "Dead Player" : c.player.body.name === "" ? "An unnamed player" : c.player.body.name;
                        if (Name.includes('§36§[dev]§reset§\u200b')) {Name = Name.replace('§36§[dev]§reset§\u200b','[dev]');}
                        let playerID =
                            c.player.body == null ? "dead" : c.player.body.id;
                        return `**${Name}** - [${playerID}]`;
                    })
                    .join("\n\n");
                interaction.createMessage(generateSuccessMessage("Player list", `${sockets.clients.length} ${sockets.clients.length === 1 ? 'player' : 'players'} connected\n\n${list}`, "", "", "green", generateRequestedBy(user)));
                break;
            case "restart":
                if (developers.includes(user.id)) {
                    closeArena();
                    interaction.createMessage(generateSuccessMessage("Restart command", "", "Success", "Server restart initiated!", "green", generateRequestedBy(user)));
                    log("green", "Server restart", generateRequestedBy(user));
                } else {
                    interaction.createMessage(generateErrorMessage("Restart", generateRequestedBy(user)));
                }
                break;
        }
    }
});



bot.on("error", (err) => {
    bot.disconnect();
    console.error(err);
});

module.exports = ({ Events }) => {
    Events.on("chatMessage", ({ message, socket }) => {
        if (!socket.player.body || message.startsWith("/")) return;
        let playerName = socket.player.body.name
            ? socket.player.body.name
            : "Unnamed";
        bot.createMessage(chatChannel, {
            embed: {
                color: themeColor,
                fields: [
                    {
                        name: `${playerName + ":"}`,
                        value: `${message}`,
                    },
                ],
            },
        });
    });
    Events.on("playerJoin", ({ name }) => {
        bot.createMessage(chatChannel, {
            embed: {
                color: 65280,
                fields: [
                    {
                        name: `${name}`,
                        value: `has joined!`,
                    },
                ],
            },
        });
        bot.connect();
    });

    Events.on("playerLeave", ({ name }) => {
        if (name === "") name = "An unnamed player";
        bot.createMessage(chatChannel, {
            embed: {
                color: 16711680,
                fields: [
                    {
                        name: `${name}`,
                        value: `has left!`,
                    },
                ],
            },
        });
        setTimeout(updateStatus, 1000);
        bot.connect();
    });
};

bot.connect();
