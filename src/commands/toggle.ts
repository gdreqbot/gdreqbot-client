import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class ToggleCommand extends BaseCommand {
    constructor() {
        super({
            name: "toggle",
            description: "Toggle requests",
            category: "requests",
            aliases: ["t"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<Response> {
        let sets: Settings = client.db.load("settings", );
        let toggle = await client.req.toggle(client, "queue");

        if (sets.first_time) await client.db.save("settings", { first_time: false });
        if (opts.silent) return;

        return { path: toggle ? "toggle.enabled" : "toggle.disabled" };
    }
}
