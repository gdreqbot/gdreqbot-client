import { ChatClient, ChatClientOptions } from "@twurple/chat";
import MapDB from "@galaxy05/map.db";

import BaseCommand from "../structs/BaseCommand";
import CommandLoader from "../modules/CommandLoader";
import Logger from "../modules/Logger";
import Database from "../modules/Database";
import Request from "../modules/Request";
import config from "../config";

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cooldowns: Map<string, Map<string, number>>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    blacklist: MapDB;

    constructor(options: ChatClientOptions) {
        super(options);

        this.commands = new Map();
        this.cooldowns = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger();
        this.db = new Database("data.db");
        this.req = new Request();
        this.config = config;
        this.blacklist = new MapDB("blacklist.db");
    }
}

export default Gdreqbot;
