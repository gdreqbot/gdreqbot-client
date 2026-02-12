import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";

export = class InfoCommand extends BaseCommand {
    constructor() {
        super({
            name: "info",
            description: "Get info for a level in the queue",
            category: "requests",
            args: "[<query>]",
            aliases: ["i", "get", "g"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<Response> {
        let res = client.req.getLevel(client, args.join(" "));

        switch (res.status) {
            case ResCode.EMPTY:
                return { path: "generic.empty_q" };

            case ResCode.NOT_FOUND:
                return { path: "generic.lvl_not_found" };

            case ResCode.OK:
                return {
                    path: args[0] ? "info.alt" : "info.base",
                    data: {
                        name: res.level.name,
                        creator: res.level.creator,
                        id: res.level.id,
                        user: res.level.user.userName,
                        notes: res.level.notes ?? "none"
                    }
                }
        }
    }
}
