import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class RandomCommand extends BaseCommand {
    constructor() {
        super({
            name: "random",
            description: "Toggle the random queue",
            category: "requests",
            aliases: ["rndm", "togglerandom", "randomqueue", "randomq", "rndmq"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<Response> {
        let toggle = await client.req.toggle(client, "random");

        if (opts.silent) return;

        return { path: toggle ? "random.enabled" : "random.disabled" };
    }
}
