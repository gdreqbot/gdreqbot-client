import color from "chalk";
import moment from "moment";
import "moment-duration-format";
import fs from "fs";

import { app } from "electron";
const DEV = !app.isPackaged;

class Logger {
    module: string;
    private path: string;

    constructor(module: string) {
        this.module = module;
        this.path = DEV ? "./logs" : app.getPath("logs");

        if (DEV && !fs.existsSync(this.path)) fs.mkdirSync(this.path);
    }

    private write(log: string, stream: "out" | "err") {
        fs.appendFileSync(`${this.path}/${stream}.log`, `${log}\n`);
    }

    /**
     * 
     * @param content Content to log
     * @description Sends log content to stdout
     */
    log(content: string) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.blueBright("[LOG]")} ${content}`;
        const raw = `${timestamp} [${this.module}] [LOG] ${content}`;

        console.log(str);
        this.write(raw, "out");
    }

    /**
     * 
     * @param content Content to log
     * @description Sends warn content to stdout
     */
    warn(content: string) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.yellowBright("[WARN]")} ${content}`;
        const raw = `${timestamp} [${this.module}] [WARN] ${content}`;

        console.warn(str);
        this.write(raw, "out");
    }

    /**
     * 
     * @param content Content to log
     * @param error Optional error to append
     * @description Sends error content to stderr
     */
    error(content: unknown, error?: any) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.redBright("[ERR]")} ${content}`;
        const raw = `${timestamp} [${this.module}] [ERR] ${content}`;

        console.error(str, error);
        this.write(`${raw}\n${error}`, "err");
    }

    /**
     * 
     * @param content Content to log
     * @param logs Additional debugging logs
     * @description Sends debugging content to stdout
     */
    debug(content: string, logs?: any) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.rgb(255, 165, 0)("[DEBUG]")} ${content}\n${logs as string | ""}`;
        const raw = `${timestamp} [${this.module}] [DEBUG] ${content}\n${logs as string | ""}`;

        console.debug(str);
        this.write(raw, "out");
    }

    /**
     * 
     * @param userName User that ran the command
     * @param guildName Guild where the command was run
     * @param cmdName Command
     * @description Logs command execution
     */
    cmdlog(userName: string, guildName: string, cmdName: string) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.cyanBright("[CMD]")} ${color.greenBright(userName)} ran command: ${color.blueBright(cmdName)} in guild: ${color.blueBright(guildName)}`;
        const raw = `${timestamp} [${this.module}] [CMD] ${userName} ran command: ${cmdName} in guild: ${guildName}`;

        console.log(str);
        this.write(raw, "out");
    }

    /**
     * 
     * @param content Content to log
     * @description Sends log content to stdout
     */
    ready(content: string) {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.greenBright("[READY]")} ${content}`;
        const raw = `${timestamp} [${this.module}] [READY] ${content}`;

        console.log(str);
        this.write(raw, "out");
    }

    /**
     * @description Logs a bot reboot
     */
    reboot() {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        const str = `${timestamp} [${this.module}] ${color.magentaBright("[REBOOT]")} Rebooting...`;
        const raw = `${timestamp} [${this.module}] [REBOOT] Rebooting...`;

        console.log(str);
        this.write(raw, "out");
    }
}

export default Logger;
