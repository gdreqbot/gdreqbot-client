import { join } from "path";

import dotenv from "dotenv";
dotenv.config({ quiet: true, path: join(process.resourcesPath, ".env") });

import Logger from "./modules/Logger";
import Server from "./modules/Server";

import { app, BrowserWindow } from "electron";
import Database from "./modules/Database";

if (require('electron-squirrel-startup')) app.quit();

const logger = new Logger("CORE");

const database = new Database("data.db");
database.init();

const server = new Server(database);

const createWindow = () => {
    return new BrowserWindow({
        width: 1024,
        height: 768,
        icon: join(__dirname, "../assets/gdreqbot.ico"),
        autoHideMenuBar: true
    });
}

app.whenReady().then(async () => {
    try {
        const win = createWindow();
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
