import { WebSocket } from "ws";
import Gdreqbot from "./Bot";
import Database from "./Database";
import Logger from "./Logger";
import { Session } from "../datasets/session";

const port = process.env.WS_PORT || 8080;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    ws: WebSocket;
    db: Database;
    client: Gdreqbot;
    logger: Logger;

    constructor(db: Database) {
        this.ws = new WebSocket(`ws://${hostname}:${port}`);
        this.db = db;
        this.logger = new Logger("Socket");

        this.ws.on('open', () => {
            const session: Session = this.db.load("session");
            if (!session?.secret) {
                this.logger.warn("No secret");
                return this.close();
            }

            this.logger.log("Connected to server.");
            this.ws.send(
                JSON.stringify({
                    type: "auth",
                    secret: session.secret
                })
            );
        });

        this.ws.on('message', raw => {
            const msg = JSON.parse(raw.toString());

            if (msg.type == "auth_ok") this.logger.log("ok");
        });
    }

    close() {
        this.logger.log("Closing Socket...");
        this.ws.close();
    }
}
