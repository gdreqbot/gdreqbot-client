import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { inspect } from "util";

export = class EvalCommand extends BaseCommand {
    constructor() {
        super({
            name: "eval",
            description: "Evaluates arbitrary JavaScript",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        try {
            let result = await eval(args.join(" "));
            if (typeof result !== "string")
                result = inspect(result, { depth: 0 });

            if (result.length > 500) {
                client.logger.log(result);
                result = "Result exceeds character limit (check the console)";
            }

            return result;
        } catch (err) {
            client.logger.error("Eval", err);
            return err;
        }
    }
}
