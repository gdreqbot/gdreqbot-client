import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class ClearCommand extends BaseCommand {
    constructor() {
        super({
            name: "clear",
            description: "Clear the queue",
            category: "requests",
            aliases: ["purge"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<string> {
        let res = await client.req.clear(client);

        switch (res.status) {
            case ResCode.EMPTY:
                return "Kappa The queue is empty.";

            case ResCode.OK:
                if (!opts.silent) return "PogChamp Queue cleared.";
        }
    }
}
