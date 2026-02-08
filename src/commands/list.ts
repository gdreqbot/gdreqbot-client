import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import { ResCode } from "../modules/Request";
import BaseCommand from "../structs/BaseCommand";
import { LevelData } from "../datasets/levels";
import { Settings } from "../datasets/settings";

export = class ListCommand extends BaseCommand {
    constructor() {
        super({
            name: "list",
            description: "Lists levels in the queue",
            category: "requests",
            args: "[<page>]",
            aliases: ["l", "q", "queue"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        let levels: LevelData[] = client.db.load("levels", ).levels;
        let sets: Settings = client.db.load("settings", );

        let page = parseInt(args[0]);
        if (args[0] && isNaN(page))
            return "Kappa Sir that's not a number.";

        let res = client.req.list(client, page);

        switch (res.status) {
            case ResCode.EMPTY:
                return "Kappa The queue is empty.";

            case ResCode.END:
                return "Kappa There aren't that many pages.";

            case ResCode.OK:
                return `${sets.random_queue ? "[RANDOM ORDER] " : ""}Page ${page || "1"} of ${res.pages} (${levels.length} levels) | ${res.page.map(l => `${l.pos}. ${l.name} (${l.id})`).join(" - ")}`;
        }
    }
}
