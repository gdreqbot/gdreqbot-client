import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { RefreshingAuthProvider } from "@twurple/auth";
import Logger from "./modules/Logger";
import config from "./config";
import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import fs from "fs";

import { app, BrowserWindow } from "electron";

const tokenData = JSON.parse(fs.readFileSync(`./tokens.${config.botId}.json`, "utf-8"));
const authProvider = new RefreshingAuthProvider({
    clientId: config.clientId,
    clientSecret: config.clientSecret
});

authProvider.addUser(config.botId, tokenData);
authProvider.addIntentsToUser(config.botId, ["chat"]);

authProvider.onRefresh((userId, newTokenData) => {
    fs.writeFileSync(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), "utf-8");
    new Logger().log("Refreshing token...");
});

const client = new Gdreqbot({
    authProvider,
    channels: ["galaxyvinci05"]
});

const server = new Server(client);

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
        await client.db.init();
        let { port } = await server.run();
        createWindow(port.toString());
        //client.connect();
    } catch (e) {
        client.logger.error(e);
    }
});

app.on('before-quit', () => {
    server.close();
    client.logger.log("Closing server...");
});
