import { WebSocket } from "ws";
import Gdreqbot from "./Bot";
import Database from "./Database";
import Logger from "./Logger";
import { Session } from "../datasets/session";
import Server from "./Server";
import superagent from "superagent";

const port = process.env.WS_PORT || 8080;
const hostname = process.env.HOSTNAME || 'localhost';

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

            this.ws = new WebSocket(`ws://${hostname}:${port}`);

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
                if (raw.toString() == "failure") {
                    this.logger.error("Closing due to server failure...");
                    this.server.failure = true;

                    try {
                        await superagent.get(`http://127.0.0.1:${this.server.port}/failure`);  // if you're reading this yes I ran out of ideas
                    } catch (e) {
                        console.error(e);
                    }
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

            this.ws.on('close', () => {
                this.connected = false;
                this.logger.log("Closing Socket...");
            });

            this.ws.on('error', err => {
                console.error(err);
                this.logger.error('Error occurred');
            });
        });
    }

    close() {
        this.ws?.close();
    }
}
