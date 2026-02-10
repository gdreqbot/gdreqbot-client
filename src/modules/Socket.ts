import { WebSocket } from "ws";
import Gdreqbot from "./Bot";
import Database from "./Database";
import Logger from "./Logger";

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
            this.logger.ready("Connected to server.");
        });
    }

    close() {
        this.logger.log("Closing Socket...");
        this.ws.close();
    }
}
