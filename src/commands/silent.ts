import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class SilentCommand extends BaseCommand {
    constructor() {
        super({
            name: "silent",
            description: "Toggle silent mode",
            category: "requests",
            aliases: ["silent-mode", "silentmode", "togglesilent", "togglesilentmode"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean }): Promise<Response> {
        let toggle = await client.req.toggle(client, "silent");

        return { path: toggle ? "silent.enabled" : "silent.disabled" };
    }
}
