import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import { LevelData } from "../datasets/levels";
import { Settings } from "../datasets/settings";

export = class PosCommand extends BaseCommand {
    constructor() {
        super({
            name: "pos",
            description: "Get your level's position in the queue, or a specific one",
            category: "requests",
            args: "[<query>]",
            aliases: ["p", "position"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        let levels: LevelData[] = client.db.load("levels").levels;
        let sets: Settings = client.db.load("settings");

        let query = "";
        if (args[0]) {
            query = args.join(" ");
        } else {
            let usrLvls = levels.filter(l => l.user.userId == msg.userInfo.userId); // todo: change to userId
            if (!usrLvls?.length)
                return "Kappa You don't have any levels in the queue.";

            query = usrLvls[0].id;
        }

        let res = client.req.getLevel(client, query);

        switch (res.status) {
            case ResCode.EMPTY:
                return "Kappa The queue is empty.";

            case ResCode.NOT_FOUND:
                return "Kappa That level is not in the queue.";

            case ResCode.OK:
                return `${args[0] ? `'${res.level.name}'` : `Your level (${res.level.name})`} is at position ${res.pos+1} in the queue.${sets.random_queue ? " [RANDOM ORDER]" : ""}`;
        }
    }
}
