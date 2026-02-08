import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";

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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { privilegeMode: boolean }): Promise<string> {
        if (opts.privilegeMode)
            return "privileged pong";
        else
            return "pong";
    }
}
