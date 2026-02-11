import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";

export = class PartCommand extends BaseCommand {
    constructor() {
        super({
            name: "invite",
            description: "Invite gdreqbot to your stream chat!",
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage): Promise<Response> {
        return { path: "invite" };
    }
}
