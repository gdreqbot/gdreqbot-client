import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class RebootCommand extends BaseCommand {
    constructor() {
        super({
            name: "reboot",
            description: "Reboots the bot",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage): Promise<string> {
        client.logger.reboot();
        process.exit();
    }
}
