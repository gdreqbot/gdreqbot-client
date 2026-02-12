import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Logger from "./modules/Logger";
import Server from "./modules/Server";
import superagent from "superagent";

import { app, BrowserWindow } from "electron";
import Database from "./modules/Database";

const logger = new Logger("CORE");

const database = new Database("data.db");
database.init();

const server = new Server(database);

async function checkServer() {
    for (let i = 0; i < 4; i++) {
        try {
            await superagent
                .get(`${process.env.URL}/health`)
                .timeout(2000);

            logger.log("Remote Server is online");
            return true;
        } catch {
            logger.log(`Waiting for server... (${i+1}/4)`);
            await new Promise(res => setTimeout(res, 1000));
        }
    }

    return false;
}

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
        let serverStatus = await checkServer();
        let path: string;

        if (!serverStatus)
            path = "/offline";

        win.loadURL(`http://127.0.0.1:${port}${path ?? ""}`);
    } catch (e) {
        logger.error(e);
    }
});

app.on('before-quit', () => {
    server.close();
    logger.log("Closing server...");
});
