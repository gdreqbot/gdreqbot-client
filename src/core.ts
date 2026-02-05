import { RefreshingAuthProvider } from "@twurple/auth";
import fs, { unlink } from "fs";
import Logger from "./modules/Logger";
import config from "./config";
import Gdreqbot from "./structs/Bot";

import PermLevels from "./structs/PermLevels";
import { Blacklist } from "./datasets/blacklist";
import { Perm } from "./datasets/perms";
import { User } from "./structs/user";
import { Settings } from "./datasets/settings";

import { app, BrowserWindow } from "electron";

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600
    });

    win.loadURL("https://gdreqbot.ddns.net");
}

app.whenReady().then(() => {
    createWindow();
});

const tokenData = JSON.parse(fs.readFileSync(`./tokens.${config.botId}.json`, "utf-8"));
const authProvider = new RefreshingAuthProvider({
    clientId: config.clientId,
    clientSecret: config.clientSecret
});

authProvider.addUser(config.botId, tokenData);
authProvider.addIntentsToUser(config.botId, ["chat"]);

authProvider.onRefresh((userId, newTokenData) => {
    fs.writeFileSync(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), "utf-8");
    new Logger().log("Refreshing token...");
});

const client = new Gdreqbot({
    authProvider,
    channels: ["galaxyvinci05"]
});

const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));

for (const file of cmdFiles) {
    const res = client.cmdLoader.load(client, file);
    if (res) client.logger.error(res);

    delete require.cache[require.resolve(`./commands/${file}`)];
}

client.connect();

client.onConnect(async () => {
    await client.db.init();

    try {
        const { channel, timestamp } = require("../reboot.json");
        await client.say(channel, `Rebooted in ${((Date.now() - timestamp) / 1000).toFixed(1)} seconds.`);

        unlink("./reboot.json", () => {});
    } catch {}

    client.logger.log("Ready");
    client.logger.log(`Joining <channel>.`);
});

client.onJoinFailure(async (channel, reason) => {
    // todo
});

client.onMessage(async (channel, user, text, msg) => {
    if (msg.userInfo.userId == client.config.botId && process.env.ENVIRONMENT != "dev") return;

    await client.db.setDefault({ channelId: msg.channelId, channelName: channel });

    let userPerms: PermLevels;
    let blacklist: Blacklist = client.db.load("blacklist", { channelId: msg.channelId });
    let sets: Settings = client.db.load("settings", { channelId: msg.channelId });
    let perms: Perm[] = client.db.load("perms", { channelId: msg.channelId }).perms;
    let globalUserBl: string[] = client.blacklist.get("users");

    if (globalUserBl?.includes(msg.userInfo.userId)) return;

    if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
    else if (msg.userInfo.isBroadcaster) userPerms = PermLevels.STREAMER;
    else if (msg.userInfo.isMod) userPerms = PermLevels.MOD;
    else if (msg.userInfo.isVip) userPerms = PermLevels.VIP;
    else if (msg.userInfo.isSubscriber) userPerms = PermLevels.SUB;
    else if (!blacklist.users.find(u => u.userId == msg.userInfo.userId)) userPerms = PermLevels.USER;
    else userPerms = PermLevels.BLACKLISTED;

    if (text.trim() == "@gdreqbot" && sets?.prefix != client.config.prefix && !sets.silent_mode) return client.say(channel, `Prefix is: ${sets.prefix}`, { replyTo: msg });

    let isId = text.match(/\b\d{5,9}\b/);

    if (!text.startsWith(sets.prefix ?? config.prefix) && isId && userPerms != PermLevels.BLACKLISTED) {
        let reqPerm = perms?.find(p => p.cmd == client.commands.get("req").info.name);
        if ((reqPerm?.perm || client.commands.get("req").config.permLevel) > userPerms) return;

        try {
            let notes = text.replace(isId[0], "").replaceAll(/\s+/g, " ");
            await client.commands.get("req").run(client, msg, channel, [isId[0], notes.length > 1 ? notes : null], { auto: true, silent: sets.silent_mode });
        } catch (e) {
            client.say(channel, "An error occurred running command: req. If the issue persists, please contact the developer.", { replyTo: msg });
            console.error(e);
        }

        return;
    }

    if (!text.startsWith(sets.prefix ?? config.prefix)) return;

    let args = text.slice(sets.prefix?.length ?? config.prefix.length).trim().split(/ +/);
    let cmdName = args.shift().toLowerCase();
    let cmd = client.commands.get(cmdName)
        || client.commands.values().find(c => c.config.aliases?.includes(cmdName));

    if (!cmd || !cmd.config.enabled) return;

    if (!cmd.config.supportsSilent && sets.silent_mode && userPerms < PermLevels.DEV) return;

    let customPerm = perms?.find(p => p.cmd == cmd.info.name);
    if ((customPerm?.perm || cmd.config.permLevel) > userPerms) return;

    try {
        client.logger.log(`${sets.silent_mode ? "(silent) " : ""}Running command: ${cmd.info.name} in channel: ${channel}`);
        await cmd.run(client, msg, channel, args, { userPerms, silent: sets.silent_mode });
    } catch (e) {
        client.say(channel, `An error occurred running command: ${cmd.info.name}. If the issue persists, please contact the developer.`, { replyTo: msg });
        console.error(e);
    }
});
