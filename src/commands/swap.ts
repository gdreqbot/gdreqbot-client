import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class SwapCommand extends BaseCommand {
    constructor() {
        super({
            name: "swap",
            description: "Swap the position of two levels in the queue",
            category: "requests",
            args: "\"<level1>\" \"<level2>\"",
            aliases: ["sw", "switch"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<Response> {
        if (args?.length < 2) return { path: "swap.no_args" };
        let query: string[] = [];
        let separator = "";

        if (args.some(a => a.includes("\"")))
            separator = "\"";
        else if (args.some(a => a.includes("'")))
            separator = "'";

        if (separator.length) {
            let fullStr = args.join(" ");
            query[0] = fullStr.split(separator)[1];
            query[1] = fullStr.split(separator)[3];
        } else {
            query = args;
        }

        let res = await client.req.swapLevels(client, query[0], query[1]);

        switch (res.status) {
            case ResCode.EMPTY:
                return { path: "generic.empty_q" };

            case ResCode.NOT_FOUND:
                return { path: "swap.not_found", data: { name: query[res.query] } };

            case ResCode.OK:
                return {
                    path: "swap.ok",
                    data: {
                        name0: res.levels[0].level.name,
                        id0: res.levels[0].level.name,
                        pos0: res.levels[0].pos+1,
                        name1: res.levels[1].level.name,
                        id1: res.levels[1].level.name,
                        pos1: res.levels[1].pos+1
                    }
                }
        }
    }
}
