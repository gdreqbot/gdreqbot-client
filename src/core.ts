import { join } from "path";

import dotenv from "dotenv";
dotenv.config({ quiet: true, path: join(process.resourcesPath, ".env") });

import Logger from "./modules/Logger";
import Server from "./modules/Server";

import { app, BrowserWindow } from "electron";
import Database from "./modules/Database";

if (require('electron-squirrel-startup')) app.quit();

class Core {
    app: typeof app;
    win: BrowserWindow;
    logger: Logger;
    db: Database;
    server: Server;

    constructor() {
        this.app = app;
        this.logger = new Logger("CORE");
        this.db = new Database("data.db");
        this.server = new Server(this.db);
    }

    init() {
        this.db.init();

        this.app.whenReady().then(async () => {
            try {
                this.win = this.createWindow();
                let { port } = await this.server.run();

                this.win.loadURL(`http://127.0.0.1:${port}`);
            } catch (e) {
                this.logger.error(e);
            }
        });

        this.app.on('before-quit', () => {
            this.server.close();
            this.logger.log("Closing server...");
        });

        //this.app.on('browser-window-focus', function () {
        //    globalShortcut.register("CommandOrControl+R", () => {
        //        console.log("CommandOrControl+R is pressed: Shortcut Disabled");
        //    });
        //    globalShortcut.register("F5", () => {
        //        console.log("F5 is pressed: Shortcut Disabled");
        //    });
        //});
    }

    clearData() {
        this.win.webContents.session.clearStorageData();
    }

    createWindow() {
        return new BrowserWindow({
            width: 1024,
            height: 768,
            icon: join(__dirname, "../assets/gdreqbot.ico"),
            autoHideMenuBar: true
        });
    }
}

const core = new Core();
core.init();

export default core;
