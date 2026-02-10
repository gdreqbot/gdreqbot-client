import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { RefreshingAuthProvider } from "@twurple/auth";
import Logger from "./modules/Logger";
import config from "./config";
import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import fs from "fs";

import { app, BrowserWindow } from "electron";
import Database from "./modules/Database";

const logger = new Logger("CORE");

const database = new Database("data.db");
database.init();

const server = new Server(database);

const createWindow = (port: string) => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: "./assets/gdreqbot",
        autoHideMenuBar: true
    });

    win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
    try {
        let { port } = await server.run();
        createWindow(port.toString());
        //client.connect();
    } catch (e) {
        logger.error(e);
    }
});

app.on('before-quit', () => {
    server.close();
    logger.log("Closing server...");
});
