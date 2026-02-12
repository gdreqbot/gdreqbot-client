import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Logger from "./modules/Logger";
import Server from "./modules/Server";

import { app, BrowserWindow } from "electron";
import Database from "./modules/Database";

const logger = new Logger("CORE");

const database = new Database("data.db");
database.init();

const server = new Server(database);

const createWindow = () => {
    return new BrowserWindow({
        width: 800,
        height: 600,
        icon: "./assets/gdreqbot",
        autoHideMenuBar: true
    });
}

app.whenReady().then(async () => {
    try {
        const win = createWindow();
        win.loadFile("./web/views/loading.html");

        let { port } = await server.run();

        win.loadURL(`http://127.0.0.1:${port}`);
    } catch (e) {
        logger.error(e);
    }
});

app.on('before-quit', () => {
    server.close();
    logger.log("Closing server...");
});
