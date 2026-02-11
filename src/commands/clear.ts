import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<Response> {
        let res = await client.req.clear(client);

        switch (res.status) {
            case ResCode.EMPTY:
                return { path: "generic.empty_q" };

            case ResCode.OK:
                if (!opts.silent) return { path: "clear.ok" };
        }
    }
}
