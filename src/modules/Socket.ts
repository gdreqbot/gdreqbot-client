import { WebSocket } from "ws";
import Database from "./Database";
import Logger from "./Logger";
import { Session } from "../datasets/session";
import Server from "./Server";
import superagent from "superagent";

export default class {
    ws?: WebSocket;
    db: Database;
    logger: Logger;
    server: Server;
    connected = false;

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
                return reject("No secret");
            }

            this.ws = new WebSocket(process.env.WS_URL);

            this.ws.on('open', () => {
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
                        secret: session.secret
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
                    return;
                }

                const msg = JSON.parse(raw.toString());

                if (msg.type == "auth_ok") {
                    this.logger.log("Server authorized");
                    this.server.failure = false;
                    resolve();
                } else {
                    this.logger.warn("Unauthorized");
                    this.close();
                    return reject("Unauthorized");
                }
            });

            this.ws.on('close', async (code, reason) => {
                this.connected = false;
                this.logger.log(`Closing Socket... (${code}|${reason})`);

                this.ws = null;
                if (!this.server.failure) this.reconnect();
                //try {
                //    await superagent.get(`http://127.0.0.1:${this.server.port}/logout`);  // if you're reading this yes I ran out of ideas
                //} catch (e) {
                //    console.error(e);
                //}
            });

            this.ws.on('error', err => {
                console.error(err);
                this.logger.error('Error occurred: ', err);
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
        this.ws?.close();
    }

    reconnect() {
        let attemptConnection = setInterval(async () => {
            await this.connect();
            if (this.connected)
                clearInterval(attemptConnection);
        }, 2000);
    }
}

enum FailureCode {
    JOIN,
    DUPLICATE
}
