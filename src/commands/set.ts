import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class SetCommand extends BaseCommand {
    constructor() {
        super({
            name: "set",
            description: "View or edit settings",
            args: "[<setting> <value>] (for numeric options, -1 disables it)",
            aliases: ["s", "settings"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<Response> {
        let sets: Settings = client.db.load("settings");

        if (!args?.length)
            return {
                path: "set.list",
                data: {
                    list: Object.entries(sets).slice(2).filter(s => s[0] != "first_time").map(s => `${s[0]}:${s[1]}`).join(" - ")
                }
            }

        let res = await client.req.set(client, args[0], args[1]);

        switch (res.status) {
            case ResCode.INVALID_KEY:
                return { path: "set.invalid_key" };

            case ResCode.INVALID_VALUE:
                return { path: "set.invalid_value" };

            case ResCode.INVALID_RANGE:
                return { path: "set.invalid_range" };

            case ResCode.OK:
                return {
                    path: "set.ok",
                    data: {
                        key: args[0],
                        value: args[1]
                    }
                }
        }
    }
}
