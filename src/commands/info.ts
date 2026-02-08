import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        let res = client.req.getLevel(client, args.join(" "));

        switch (res.status) {
            case ResCode.EMPTY:
                return "Kappa The queue is empty.";

            case ResCode.NOT_FOUND:
                return "Kappa Couldn't find that level.";

            case ResCode.OK:
                return `${args[0] ? "Level Info" : "Now Playing"} | Level: '${res.level.name}' | Creator: ${res.level.creator} | ID: ${res.level.id} | Requested by: ${res.level.user.userName} | Notes: ${res.level.notes ?? "none"}`;
        }
    }
}
