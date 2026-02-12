import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response, Express } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import path from 'path';
import multer from "multer";
import "moment-duration-format";
import Gdreqbot from '../modules/Bot';
import { User } from "../structs/user";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";
import PermLevels from "../structs/PermLevels";
import BaseCommand, { Response as CmdResponse } from "../structs/BaseCommand";
import { Blacklist } from "../datasets/blacklist";
import { getUser } from "../apis/twitch";
import { LevelData } from "../datasets/levels";
import { getLevel } from "../apis/gd";
import { AddressInfo } from "net";
import { Server } from "http";
import { Session } from "../datasets/session";
import Logger from "./Logger";
import Database from "./Database";
import Socket from "./Socket";
import * as gdreqbot from "../apis/gdreqbot";

import { app } from "electron";
const DEV = !app.isPackaged;

export default class {
    app: Express;
    private client: Gdreqbot;
    private socket: Socket;
    server: Server;
    port: number;
    logger: Logger;
    db: Database;
    failure = false;

    constructor(db: Database) {
        this.app = express();
        this.client = null;
        this.socket = null;
        this.logger = new Logger("Server");
        this.db = db;

        const server = this.app;

        const publicPath = DEV ? path.resolve(__dirname, '../../web/public') : path.join(process.resourcesPath, 'web/public');
        const viewsPath = DEV ? path.resolve(__dirname, '../../web/views') : path.join(process.resourcesPath, 'web/views');

        server.use('/public', express.static(publicPath));
        server.use(express.json());
        server.use(express.urlencoded({ extended: false }));
        server.use(
            session({
                genid: () => {
                    return uuid();
                },
                secret: process.env.SESSION_SECRET,
                resave: false,
                saveUninitialized: false
            }),
        );
        server.use(bodyParser.json());
        server.set('views', viewsPath);

        server.set('view engine', 'ejs');

        // const renderView = (req: Request, res: Response, view: string, data: any = {}) => {
        //     const baseData = {
        //         bot: this.client,
        //         path: req.path,
        //     };
        //     res.render(path.resolve(`./web/views/${view}`), Object.assign(baseData, data));
        // };

        server.get('/', (req, res) => {
            res.render('index');
        });

        server.get('/auth', async (req, res, next) => {
            let serverStatus = await gdreqbot.checkServer(this.logger);
            if (!serverStatus)
                return res.redirect('/offline');

            const redirect = `http://127.0.0.1:${this.port}/auth/callback`;
            const url = `${process.env.URL}/auth?redirect_uri=${encodeURIComponent(redirect)}`;

            res.redirect(url);
        });

        server.get('/auth/callback', async (req, res) => {
            const { secret } = req.query;
            if (!secret)
                return res.status(400).send('Missing secret');

            try {
                let user = await gdreqbot.getUser(secret.toString(), require('../../package.json').version);
                if (!user) return;

                await this.db.save("session", {
                    userId: user.userId,
                    userName: user.userName,
                    secret
                });

                this.socket = new Socket(this.db, this);
                try {
                    await this.socket.connect();
                } catch (e) {
                    this.logger.warn(e);
                }

                this.client = new Gdreqbot(this.db, this.socket);
                this.client.connect();

                this.checkAuth();

                res.redirect('/dashboard');
            } catch (e) {
                switch (e.message) {
                    case "Outdated client": {
                        this.logger.warn("Outdated client");
                        res.redirect(`/outdated?upstream=${encodeURIComponent(e.upstream)}`);
                        break;
                    }

                    case "Blacklisted": {
                        this.logger.warn("Blacklisted");
                        res.redirect('/auth/error');
                        break;
                    }

                    default: {
                        this.logger.warn("Unauthorized");
                        res.status(401).send(e.message);
                        break;
                    }
                }
            }
        });

        server.get('/auth/error', (req, res) => {
            res.render('autherror');
        });

        server.get('/dashboard', (req, res) => {
            res.redirect('/dashboard/requests');
        });

        server.get('/dashboard/requests', /* this.checkAuth, */async (req, res) => {
            if (this.failure)
                return res.redirect('/error');

            if (!this.socket?.connected) {
                this.socket = null;
                return res.redirect('/');
            }

            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;

            let levels: LevelData[] = this.db.load("levels").levels;
            let sets: Settings = this.db.load("settings");
            let bl: Blacklist = this.db.load("blacklist");

            res.render('dashboard/requests', {
                isAuthenticated: true,
                user: {
                    userId,
                    userName
                },
                levels,
                sets,
                bl,
                page: "req",
                hide_note: sets.hide_note,
                url: `http://127.0.0.1:${this.port}`
            });
        });

        server.post('/dashboard/requests', multer().none(), async (req, res) => {
            if (this.failure)
                return res.redirect('/error');

            if (!this.socket?.connected) {
                this.socket = null;
                return res.redirect('/');
            }

            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;

            let levels: LevelData[] = this.db.load("levels").levels;
            let sets: Settings = this.db.load("settings");
            let bl: Blacklist = this.db.load("blacklist");

            let args: string[] = [];
            let cmd: BaseCommand;

            if (req.body.formType.startsWith("toggle")) {
                let type = req.body.formType.split("-")[1];
                cmd = this.client.commands.get(type.replace("req", "toggle"));
            } else if (req.body.formType.startsWith("blacklist")){
                let type = req.body.formType.split("-")[1];

                if (type == "user" && !bl.users.find(u => u.userId == levels[0].user.userId))
                    bl.users.push(levels[0].user);
                else if (type == "level" && !bl.levels.find(l => l.id == levels[0].id))
                    bl.levels.push({
                        name: levels[0].name,
                        creator: levels[0].creator,
                        id: levels[0].id,
                        user: null,
                        notes: null
                    });

                await this.db.save("blacklist", bl);
                this.logger.log(`(auto) Blacklisted ${type} in channel: ${userName}`);
                return res.status(200).json({ success: true });
            } else if (req.body.formType.startsWith("remove")) {
                if (!levels.length) return res.status(200).json({ success: true });

                let id = req.body.formType.split("-")[1];
                cmd = this.client.commands.get("privilege");
                args = ["remove", id];
            } else {
                if (!levels.length) return res.status(200).json({ success: true }); 
                cmd = this.client.commands.get(req.body.formType);
            }

            try {
                this.logger.log(`(auto) Running command: ${cmd.info.name} in channel: ${userName}`);
                let res: CmdResponse | void = await cmd.run(this.client, { channelId: userId } as any, userName, args, { auto: true, silent: sets.silent_mode });

                if (res) {
                    this.socket.ws.send(
                        JSON.stringify({
                            res
                        })
                    );
                }
            } catch (e) {
                this.socket.ws.send(
                    JSON.stringify({
                        res: "generic.cmd_error",
                        data: {
                            cmd: cmd.info.name
                        }
                    })
                );
                this.logger.log(e);
            }

            res.status(200).json({ success: true });
        });

        server.get('/dashboard/configuration', async (req, res) => {
            if (this.failure)
                return res.redirect('/error');

            if (!this.socket?.connected) {
                this.socket = null;
                return res.redirect('/');
            }

            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;

            let sets: Settings = this.db.load("settings");
            let perms: Perm[] = this.db.load("perms").perms;
            let bl: Blacklist = this.db.load("blacklist");

            let cmdData: any = [];
            let setData: any = this.getSettings(sets);

            this.client.commands.forEach(cmd => {
                let permData = perms.find(p => p.cmd == cmd.info.name);

                let toPush = {
                    name: cmd.info.name,
                    desc: cmd.info.description,
                    perm: this.normalize(PermLevels[permData?.perm ?? cmd.config.permLevel]),
                    defaultPerm: this.normalize(PermLevels[cmd.config.permLevel]),
                    isDefault: !Boolean(permData)
                };

                cmdData.push(toPush);
            });

            let permLiterals = Object.keys(PermLevels).filter(k => isNaN(Number(k)));
            permLiterals.pop();

            res.render('dashboard/config', {
                isAuthenticated: true,
                user: {
                    userId,
                    userName
                },
                setData,
                cmdData,
                perms: permLiterals.map(p => this.normalize(p)),
                bl,
                page: "set",
                hide_note: sets.hide_note,
                url: `http://127.0.0.1:${this.port}`
            });
        });

        server.post('/dashboard/configuration', multer().none(), async (req, res) => {
            if (this.failure)
                return res.redirect('/error');

            if (!this.socket?.connected) {
                this.socket = null;
                return res.redirect('/');
            }

            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;

            switch (req.body.formType) {
                case "settings": {
                    let sets = this.parseSettings(req.body);
                    await this.db.save("settings", sets);
                    this.logger.log(`Dashboard: updated settings for channel: ${userName}`);
                    break;
                }

                case "perms": {
                    let perms: Perm[] = this.db.load("perms").perms;
                    let filtered = this.filterPerms(req.body, perms, this.client.commands);

                    filtered.forEach(perm => {
                        let name = perm.cmd.split('.')[0];
                        let toDelete = Boolean(perm.cmd.split('.')[1]);

                        let savedPerm = perms.find(p => p.cmd == name);

                        if (savedPerm) {
                            if (toDelete)
                                perms.splice(perms.findIndex(p => p.cmd == name), 1);
                            else
                                savedPerm.perm = perm.perm;
                        } else
                            if (!toDelete) perms.push(perm);
                    });

                    await this.db.save("perms", { perms });
                    this.logger.log(`Dashboard: updated perms for channel: ${userName}`);
                    break;
                }

                case "blacklist-users": {
                    let userBl: User[] = this.db.load("blacklist").users;
                    let invalid: string[] = [];

                    switch (req.body.action) {
                        case "add": {
                            let users = req.body.users.split(",").map((u: string) => u.trim()).filter(Boolean);
                            let hasInvalid = false;

                            for (let i = 0; i < users.length; i++) {
                                let raw = await getUser(users[i], "login");
                                if (!raw?.data.length) {
                                    invalid.push(users[i]);
                                    hasInvalid = true;
                                    continue;
                                }

                                if (hasInvalid)
                                    continue;

                                let data = {
                                    userId: raw.data[0].id,
                                    userName: raw.data[0].login
                                };

                                if (!userBl.find(u => u.userId == data.userId))
                                    userBl.push(data);
                            }

                            break;
                        }

                        case "remove": {
                            let idx = userBl.findIndex(u => u.userId == req.body.id);
                            if (idx == -1) return res.status(200).json({ success: true });

                            userBl.splice(idx, 1);
                            break;
                        }

                        case "clear": {
                            userBl = [];
                            break;
                        }
                    }

                    await this.db.save("blacklist", { users: userBl });

                    if (invalid.length > 0) {
                        res.status(400).json({
                            success: false,
                            invalid,
                        });
                    } else {
                        this.logger.log(`Dashboard: updated user blacklist for channel: ${userName}`);
                        res.status(200).json({ success: true });
                    }
                    break;
                }

                case "blacklist-levels": {
                    let levelBl: LevelData[] = this.db.load("blacklist").levels;
                    let invalid: string[] = [];

                    switch (req.body.action) {
                        case "add": {
                            let levels = req.body.levels.split(",").map((u: string) => u.trim()).filter(Boolean);
                            let hasInvalid = false;

                            for (let i = 0; i < levels.length; i++) {
                                let raw = await getLevel(levels[i]);
                                if (raw == "-1") {
                                    invalid.push(levels[i]);
                                    hasInvalid = true;
                                    continue;
                                }

                                if (hasInvalid)
                                    continue;

                                let data = this.client.req.parseLevel(raw);

                                if (!levelBl)
                                    levelBl = [data];
                                else if (!levelBl.find(l => l.id == data.id))
                                    levelBl.push(data);
                            }

                            break;
                        }

                        case "remove": {
                            if (!levelBl)
                                break;

                            let idx = levelBl.findIndex(l => l.id == req.body.id);
                            if (idx == -1) return res.status(200).json({ success: true });

                            levelBl.splice(idx, 1);
                            break;
                        }

                        case "clear": {
                            levelBl = [];
                            break;
                        }
                    }

                    await this.db.save("blacklist", { levels: levelBl });

                    if (invalid.length > 0) {
                        res.status(400).json({
                            success: false,
                            invalid,
                        });
                    } else {
                        this.logger.log(`Dashboard: updated level blacklist for channel: ${userName}`);
                        res.status(200).json({ success: true });
                    }
                    break;
                }

                default: {
                    this.logger.error("what???");
                    break;
                }
            }

            res.status(200);
        });

        server.get('/dashboard/hide', multer().none(), async (req, res) => {
            let sets: Settings = this.db.load("settings");
            if (!sets.hide_note) await this.db.save("settings", { hide_note: true });

            res.status(200).json({ success: true });
        });

        server.get('/login', async (req, res) => {
            res.render('loading');
        });

        server.get('/logout', async (req, res, next) => {
            const session: Session = this.db.load("session");
            if (session) {
                await this.db.delete("session");
                this.client.quit();
                this.client = null;
            }

            res.redirect('/');
        });

        server.get('/offline', (req, res) => {
            res.render('offline');
        });

        server.get('/outdated', (req, res) => {
            res.render('outdated', {
                version: require('../../package.json').version,
                upstream: req.query.upstream
            });
        });

        server.get('/error', (req, res) => {
            res.render('error');
        });

        server.get('/failure', (req, res) => {  // if you found this congrats you can now quit the bot whenever you want
            this.client.quit();
            res.status(200).json({ text: "ok" });
        });
    }

    run(): Promise<ServerOutput> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(0, '127.0.0.1', () => {
                let port = (this.server.address() as AddressInfo).port;

                this.logger.log(`Server listening on http://127.0.0.1:${port}`);
                this.port = port;
                resolve({
                    port,
                    close: () => this.close()
                });
            });

            this.server.on('error', reject);
        });
    }

    close() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    private checkAuth() {
        setInterval(async () => {
            try {
                let session: Session = this.db.load("session");
                await gdreqbot.getUser(session?.secret, require('../../package.json').version);
            } catch {
                this.failure = true;
            }
        }, 5*60*1000); // 5 min
    }

    private getSettings(sets: any) {
        const { defaultValues } = require('../datasets/settings');
        let obj: any = {};

        for (let [key, value] of Object.entries(defaultValues).slice(1)) {
            if (!sets[key])
                obj[key] = {
                    value,
                    defaultValue: value,
                    isDefault: true
                };
            else
                obj[key] = {
                    value: sets[key],
                    defaultValue: value,
                    isDefault: sets[key] == defaultValues[key]
                };
        }

        return obj;
    }

    private parseSettings(data: any) {
        let parsed: any = {};

        for (let [key, value] of Object.entries(data)) {
            if (key == "formType") continue;
            if (!value) {
                parsed[key] = -1;
                continue;
            }

            let n = parseInt(value as any);
            if (!isNaN(n))
                value = n;

            parsed[key] = value;
        }

        return parsed;
    }

    private filterPerms(data: any, perms: Perm[], cmds: Map<string, BaseCommand>) {
        let filtered: Perm[] = [];

        for (let [key, value] of Object.entries(data)) {
            if (!value) continue;

            let cmd = cmds.get(key);
            if (!cmd) continue;

            let permData = perms.find(p => p.cmd == cmd.info.name);
            let permValue: any = PermLevels[(value as any).toUpperCase()];

            if (permValue != (permData?.perm ?? cmd.config.permLevel)) {
                filtered.push({
                    cmd: permValue == cmd.config.permLevel ? `${cmd.info.name}.d` : cmd.info.name,
                    perm: permValue
                });
            }
        }

        return filtered;
    }

    private normalize(str: string) {
        let normalized = str.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
}

export interface ServerOutput {
    port: number;
    close: Function;
}
