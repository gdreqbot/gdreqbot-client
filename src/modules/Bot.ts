import { ChatClient, ChatClientOptions } from "@twurple/chat";
import MapDB from "@galaxy05/map.db";

import BaseCommand from "../structs/BaseCommand";
import CommandLoader from "../modules/CommandLoader";
import Logger from "../modules/Logger";
import Database from "../modules/Database";
import Request from "../modules/Request";
import config from "../config";
import { unlink } from "original-fs";
import fs from "fs";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cooldowns: Map<string, Map<string, number>>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    blacklist: MapDB;

    constructor(options: ChatClientOptions) {
        super(options);

        this.commands = new Map();
        this.cooldowns = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger();
        this.db = new Database("data.db");
        this.req = new Request();
        this.config = config;

        const client = this;

        client.onConnect(async () => {
            client.logger.log("Ready");
            client.logger.log(`Joining <channel>.`);
        });

        client.onJoinFailure(async (channel, reason) => {
            // todo
        });

        client.onMessage(async (channel, user, text, msg) => {
            if (msg.userInfo.userId == client.config.botId && process.env.ENVIRONMENT != "dev") return;

            //await client.db.setDefault({ channelId: msg.channelId, channelName: channel });

            let userPerms: PermLevels;
            let blacklist: Blacklist = client.db.load("blacklist");
            let sets: Settings = client.db.load("settings");
            let perms: Perm[] = client.db.load("perms").perms;
            let globalUserBl: string[] = client.blacklist.get("users");

            if (globalUserBl?.includes(msg.userInfo.userId)) return;

            if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
            else if (msg.userInfo.isBroadcaster) userPerms = PermLevels.STREAMER;
            else if (msg.userInfo.isMod) userPerms = PermLevels.MOD;
            else if (msg.userInfo.isVip) userPerms = PermLevels.VIP;
            else if (msg.userInfo.isSubscriber) userPerms = PermLevels.SUB;
            else if (!blacklist.users.find(u => u.userId == msg.userInfo.userId)) userPerms = PermLevels.USER;
            else userPerms = PermLevels.BLACKLISTED;

            if (text.trim() == "@gdreqbot" && sets?.prefix != client.config.prefix && !sets.silent_mode) return `Prefix is: ${sets.prefix}`;

            let isId = text.match(/\b\d{5,9}\b/);

            if (!text.startsWith(sets.prefix ?? config.prefix) && isId && userPerms != PermLevels.BLACKLISTED) {
                let reqPerm = perms?.find(p => p.cmd == client.commands.get("req").info.name);
                if ((reqPerm?.perm || client.commands.get("req").config.permLevel) > userPerms) return;

                try {
                    let notes = text.replace(isId[0], "").replaceAll(/\s+/g, " ");
                    await client.commands.get("req").run(client, msg, [isId[0], notes.length > 1 ? notes : null], { auto: true, silent: sets.silent_mode });
                } catch (e) {
                    "An error occurred running command: req. If the issue persists, please contact the developer.";
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
                await cmd.run(client, msg, args, { userPerms, silent: sets.silent_mode });
            } catch (e) {
                `An error occurred running command: ${cmd.info.name}. If the issue persists, please contact the developer.`;
                console.error(e);
            }
        });
    }

    loadCommands() {
        const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));

        for (const file of cmdFiles) {
            const res = this.cmdLoader.load(this, file);
            if (res) this.logger.error(res);

            delete require.cache[require.resolve(`./commands/${file}`)];
        }
    }
}

export default Gdreqbot;
