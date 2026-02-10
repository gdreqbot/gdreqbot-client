import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response, Express } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import path from 'path';
import multer from "multer";
import moment from "moment";
import "moment-duration-format";
import fs from "fs";
import superagent from "superagent";
import Gdreqbot from '../modules/Bot';
import { User } from "../structs/user";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";
import PermLevels from "../structs/PermLevels";
import BaseCommand from "../structs/BaseCommand";
import { Blacklist } from "../datasets/blacklist";
import { getUser } from "../apis/twitch";
import { LevelData } from "../datasets/levels";
import { getLevel } from "../apis/gd";
import { AddressInfo } from "net";
import { Server } from "http";
import { Session } from "../datasets/session";
import Logger from "./Logger";
import Database from "./Database";
import config from "../config";

export default class {
    app: Express;
    private client: Gdreqbot;
    server: Server;
    port: number;
    logger: Logger;
    db: Database;

    constructor(db: Database) {
        this.app = express();
        this.client = null;
        this.logger = new Logger("Server");
        this.db = db;

        const server = this.app;

        server.use('/public', express.static(path.resolve(__dirname, '../../web/public')));
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
        server.set('views', path.join(__dirname, '../../web/views'));

        server.set('view engine', 'ejs');

        const renderView = (req: Request, res: Response, view: string, data: any = {}) => {
            const baseData = {
                bot: this.client,
                path: req.path,
            };
            res.render(path.resolve(`./web/views/${view}`), Object.assign(baseData, data));
        };

        server.get('/', (req, res) => {
            renderView(req, res, 'index');
        });

        server.get('/auth', (req, res, next) => {
            //let redirectTo = req.query.redirectTo || 'dashboard';
            const redirect = `http://127.0.0.1:${this.port}/auth/callback`;
            const url = `${process.env.URL}/auth?redirect_uri=${encodeURIComponent(redirect)}`;

            res.redirect(url);

            //passport.authenticate('twitch', {
            //    state: redirectTo as string
            //})(req, res, next);
        });

        server.get('/auth/callback', async (req, res) => {
            const { secret } = req.query;
            if (!secret)
                return res.status(400).send('Missing secret');

            const user = await superagent
                .get(`${process.env.URL}/api/me`)
                .set('Authorization', `Bearer ${secret}`);

            console.log(user.body);

            await this.db.save("session", {
                userId: user.body.userId,
                userName: user.body.userName,
                secret
            });

            this.client = new Gdreqbot(db);
            this.client.connect();

            res.redirect('/dashboard');


            //let redirectTo = req.query.state;

            //if (redirectTo == 'add')
            //    res.redirect('/auth/success');
            //else if (redirectTo == 'dashboard')
            //    res.redirect('/dashboard');
            //else
            //    res.redirect('/');
        });

        server.get('/auth/success', (req, res) => {
            renderView(req, res, 'authsuccess');
        });

        server.get('/auth/error', (req, res) => {
            renderView(req, res, 'autherror');
        });

        server.get('/dashboard', (req, res) => {
            res.redirect('/dashboard/requests');
        });

        server.get('/dashboard/requests', /* this.checkAuth, */async (req, res) => {
            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;
            //await this.db.setDefault({ channelId: userId, channelName: userName });

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
                await cmd.run(this.client, { channelId: userId } as any, args, { auto: true, silent: sets.silent_mode });
                this.logger.log(`(auto) Running command: ${cmd.info.name} in channel: ${userName}`);
            } catch (e) {
                this.client.say(userName, `An error occurred running command: ${cmd.info.name}. If the issue persists, please contact the developer.`);
                console.error(e);
            }

            res.status(200).json({ success: true });
        });

        server.get('/dashboard/configuration', async (req, res) => {
            const session: Session = this.db.load("session");
            const userId = session.userId;
            const userName = session.userName;

            //await this.db.setDefault({ channelId: userId, channelName: userName });

            let sets: Settings = this.db.load("settings");
            let perms: Perm[] = this.db.load("perms").perms;
            let bl: Blacklist = this.db.load("blacklist");

            let cmdData: any = [];
            let setData: any = this.getSettings(sets);

            this.client.commands.forEach(cmd => {
                if (cmd.config.permLevel == PermLevels.DEV) return;

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
            //await this.db.setDefault({ channelId: userId, channelName: userName });

            let sets: Settings = this.db.load("settings");
            if (!sets.hide_note) await this.db.save("settings", { hide_note: true });

            res.status(200).json({ success: true });
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

    private checkAuth(req: Request, res: Response, next: NextFunction) {
        if (req.isAuthenticated())
            return next();

        res.redirect('/');
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
