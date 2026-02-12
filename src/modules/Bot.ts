import { ChatClient, ChatClientOptions } from "@twurple/chat";

import BaseCommand, { Response } from "../structs/BaseCommand";
import CommandLoader from "../modules/CommandLoader";
import Logger from "../modules/Logger";
import Database from "../modules/Database";
import Request from "../modules/Request";
import config from "../config";
import fs from "fs";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";
import { Session } from "../datasets/session";
import Socket from "./Socket";
import { getBlacklist } from "../apis/gdreqbot";

import { app } from "electron";
import { join } from "path";
const DEV = !app.isPackaged;

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cooldowns: Map<string, Map<string, number>>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    socket: Socket;

    constructor(db: Database, socket: Socket, options?: ChatClientOptions) { 
        const session: Session = db.load("session");
        if (!session?.secret)
            throw new Error('No session secret');

        super({
            ...options,
            channels: [session.userName]
        });

        this.commands = new Map();
        this.cooldowns = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger("Client");
        this.db = db;
        this.req = new Request();
        this.config = config;
        this.socket = socket;

        this.loadCommands();

        this.onConnect(() => {
            this.logger.ready("Ready");
            this.logger.ready(`Joining channel: ${session.userName}`);
        });

        this.onDisconnect(() => this.logger.log("Disconnecting..."));

        this.onJoinFailure(async (channel, reason) => {
            this.logger.error(`Failed to join channel: ${channel} for reason: ${reason}`);
        });

        this.onMessage(async (channel, user, text, msg) => {
            if (msg.userInfo.userId == this.config.botId && process.env.ENVIRONMENT != "dev") return;

            let globalBl = await getBlacklist(msg.userInfo.userId, "users");
            if (globalBl) return;

            let userPerms: PermLevels;
            let blacklist: Blacklist = this.db.load("blacklist");
            let sets: Settings = this.db.load("settings");
            let perms: Perm[] = this.db.load("perms").perms;

            if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
            else if (msg.userInfo.isBroadcaster) userPerms = PermLevels.STREAMER;
            else if (msg.userInfo.isMod) userPerms = PermLevels.MOD;
            else if (msg.userInfo.isVip) userPerms = PermLevels.VIP;
            else if (msg.userInfo.isSubscriber) userPerms = PermLevels.SUB;
            else if (!blacklist.users.find(u => u.userId == msg.userInfo.userId)) userPerms = PermLevels.USER;
            else userPerms = PermLevels.BLACKLISTED;

            if (text.trim() == "@gdreqbot" && sets?.prefix != this.config.prefix && !sets.silent_mode) return `Prefix is: ${sets.prefix}`;

            let isId = text.match(/\b\d{5,9}\b/);

            if (!text.startsWith(sets.prefix ?? config.prefix) && isId && userPerms != PermLevels.BLACKLISTED) {
                let reqPerm = perms?.find(p => p.cmd == this.commands.get("req").info.name);
                if ((reqPerm?.perm || this.commands.get("req").config.permLevel) > userPerms) return;

                try {
                    let notes = text.replace(isId[0], "").replaceAll(/\s+/g, " ");
                    let res: Response | void = await this.commands.get("req").run(this, msg, channel, [isId[0], notes.length > 1 ? notes : null], { auto: true, silent: sets.silent_mode });

                    if (res) {
                        this.socket.ws.send(
                            JSON.stringify({
                                res,
                                msgId: msg.id
                            })
                        );
                    }
                } catch (e) {
                    this.socket.ws.send(
                        JSON.stringify({
                            res: {
                                path: "generic.cmd_error",
                                data: {
                                    cmd: "req"
                                }
                            },
                            msgId: msg.id
                        })
                    );
                    this.logger.error(e);
                }

                return;
            }

            if (!text.startsWith(sets.prefix ?? config.prefix)) return;

            let args = text.slice(sets.prefix?.length ?? config.prefix.length).trim().split(/ +/);
            let cmdName = args.shift().toLowerCase();
            let cmd = this.commands.get(cmdName)
                || this.commands.values().find(c => c.config.aliases?.includes(cmdName));

            if (!cmd || !cmd.config.enabled) return;

            if (!cmd.config.supportsSilent && sets.silent_mode && userPerms < PermLevels.DEV) return;

            let customPerm = perms?.find(p => p.cmd == cmd.info.name);
            if ((customPerm?.perm || cmd.config.permLevel) > userPerms) return;

            try {
                this.logger.log(`${sets.silent_mode ? "(silent) " : ""}Running command: ${cmd.info.name} in channel: ${channel}`);
                let res: Response | void = await cmd.run(this, msg, channel, args, { userPerms, silent: sets.silent_mode });

                if (res) {
                    this.socket.ws.send(
                        JSON.stringify({
                            res,
                            msgId: msg.id
                        })
                    );
                }
            } catch (e) {
                this.socket.ws.send(
                    JSON.stringify({
                        res: {
                            path: "generic.cmd_error",
                            data: {
                                cmd: cmd.info.name
                            }
                        },
                        msgId: msg.id
                    })
                );
                this.logger.error(e);
            }
        });
    }

    loadCommands() {
        const cmdFiles = fs.readdirSync(DEV ? "./dist/commands/" : join(process.resourcesPath, "dist/commands")).filter(f => f.endsWith(".js"));

        for (const file of cmdFiles) {
            const res = this.cmdLoader.load(this, file);
            if (res) this.logger.error(res);

            delete require.cache[require.resolve(`../commands/${file}`)];
        }
    }
}

export default Gdreqbot;
