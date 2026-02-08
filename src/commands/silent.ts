import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class SilentCommand extends BaseCommand {
    constructor() {
        super({
            name: "silent",
            description: "Toggle silent mode",
            category: "requests",
            aliases: ["silent-mode", "silentmode", "togglesilent", "togglesilentmode"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean }): Promise<string> {
        let toggle = await client.req.toggle(client, "silent");

        return `Silent mode is now ${toggle ? "enabled" : "disabled"}. ${toggle ? "The bot will stop sending any messages in chat." : "The bot will send messages as usual."}`;
    }
}
