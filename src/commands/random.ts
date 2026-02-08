import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<string> {
        let sets: Settings = client.db.load("settings", );
        let toggle = await client.req.toggle(client, "random");

        if (opts.silent) return;

        return `Random queue is now ${toggle ? "enabled" : "disabled"}. ${toggle ? (opts.auto ? "Levels will now be picked randomly from the queue." : `Typing ${sets.prefix ?? client.config.prefix}next will now pick a random level from the queue.`) : "The queue order is followed as normal."}`;
    }
}
