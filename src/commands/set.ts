import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        let sets: Settings = client.db.load("settings");

        if (!args?.length)
            return `Settings: ${Object.entries(sets).slice(2).filter(s => s[0] != "first_time").map(s => `${s[0]}:${s[1]}`).join(" - ")}`;

        let res = await client.req.set(client, args[0], args[1]);

        switch (res.status) {
            case ResCode.INVALID_KEY:
                return "Error: invalid setting";

            case ResCode.INVALID_VALUE:
                return "Error: invalid value";

            case ResCode.INVALID_RANGE:
                return "Error: value must be either -1 or greater than 0";

            case ResCode.OK:
                return `Set '${args[0]}' to '${args[1]}'`;
        }
    }
}
