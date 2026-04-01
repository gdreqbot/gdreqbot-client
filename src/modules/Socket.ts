import { WebSocket } from "ws";
import Database from "./Database";
import Logger from "./Logger";
import { Session } from "../datasets/session";
import Server from "./Server";
import { promisify } from "util";

const wait = promisify(setTimeout);

export default class {
    ws?: WebSocket;
    db: Database;
    logger: Logger;
    server: Server;
    connected = false;
    reconnecting = false;
    abort = false;
    retries = 1;

    constructor(db: Database, server: Server) {
        this.db = db;
        this.server = server;
        this.logger = new Logger("Socket");
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const session: Session = this.db.load("session");
            if (!session?.secret) {
                this.logger.warn("No secret");
                return reject("no_secret");
            }

            this.ws = new WebSocket(process.env.WS_URL);

            this.ws.on('open', () => {
                this.reconnecting = false;
                this.retries = 1;

                const session: Session = this.db.load("session");
                if (!session?.secret) {
                    this.logger.warn("No secret");
                    return this.close();
                }

                this.connected = true;
                this.logger.log("Connected to server.");
                this.ws.send(
                    JSON.stringify({
                        type: "auth",
                        secret: session.secret,
                        version: `${process.platform}:${require('../../package.json').version}`
                    })
                );
            });

            this.ws.on('message', async raw => {
                if (raw.toString().startsWith("failure")) {
                    this.logger.error(`Closing due to server failure... (code ${raw.toString().split(":")[1]})`);
                    this.server.failure = true;

                    //try {
                    //    await superagent.get(`http://127.0.0.1:${this.server.port}/logout`);  // if you're reading this yes I ran out of ideas
                    //} catch (e) {
                    //    console.error(e);
                    //}
                    return reject(`failure:${raw.toString().split(":")[1]}}`);
                }

                const msg = JSON.parse(raw.toString());

                if (msg.type == "auth_ok") {
                    this.logger.log("Server authorized");
                    this.server.failure = false;
                    resolve();
                } else {
                    this.logger.warn("Unauthorized");
                    this.close();
                    return reject("unauthorized");
                }
            });

            this.ws.on('close', async (code, reason) => {
                this.connected = false;
                this.logger.log(`Closing Socket... (${code}|${reason})`);

                this.ws = null;
                if (!this.server.failure) {
                    this.reconnecting = true;
                    this.reconnect();
                }
                //try {
                //    await superagent.get(`http://127.0.0.1:${this.server.port}/logout`);  // if you're reading this yes I ran out of ideas
                //} catch (e) {
                //    console.error(e);
                //}
            });

            this.ws.on('error', err => {
                if (!this.reconnecting) {
                    console.error(err);
                    this.logger.error('Error occurred: ', err);
                }
            });

            this.ws.on('ping', () => {
                this.ws.pong();
            });
        });
    }

    send(msg: string) {
        if (this.ws) {
            this.ws.send(msg);
            return true;
        } else {
            return false;
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.abort = true;
            this.reconnecting = false;
            return true;
        } else {
            return false;
        }
    }

    reconnect() {
        if (this.server.failure || !this.reconnecting) return;

        this.ws = null;
        this.logger.log(`Trying to reconnect... (${this.retries})`);

        setTimeout(() => {
            if (this.server.failure || !this.reconnecting || this.connected) return;

            this.connect().catch(() => {});
        }, 2000);

        this.retries++;
    }
}

enum FailureCode {
    JOIN,
    DUPLICATE
}
