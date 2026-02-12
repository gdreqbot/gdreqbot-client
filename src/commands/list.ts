import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import { ResCode } from "../modules/Request";
import BaseCommand, { Response } from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<Response> {
        let levels: LevelData[] = client.db.load("levels", ).levels;
        let sets: Settings = client.db.load("settings", );

        let page = parseInt(args[0]);
        if (args[0] && isNaN(page))
            return { path: "generic.nan" };

        let res = client.req.list(client, page);

        switch (res.status) {
            case ResCode.EMPTY:
                return { path: "generic.empty_q" };

            case ResCode.END:
                return { path: "generic.page_overflow" };

            case ResCode.OK:
                return {
                    path: sets.random_queue ? "list.random" : "list.base",
                    data: {
                        page: page || "1",
                        pages: res.pages,
                        size: levels.length,
                        list: res.page.map(l => `${l.pos}. ${l.name} (${l.id})`).join(" - ")
                    }
                }
        }
    }
}
