import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";

export = class PingCommand extends BaseCommand {
    constructor() {
        super({
            name: "ping",
            description: "Gives the bot latency",
            privilegeDesc: "Gives the privileged bot latency",
            enabled: true,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { privilegeMode: boolean }): Promise<Response> {
        return { path: opts.privilegeMode ? "ping.alt" : "ping.base" };
    }
}
