import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import { Settings } from "../datasets/settings";

export = class ReqCommand extends BaseCommand {
    constructor() {
        super({
            name: "req",
            description: "Request a level by name or ID",
            category: "requests",
            args: "<query> [<notes>]",
            aliases: ["r", "request", "add", "join"],
            enabled: true,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { auto: boolean, silent: boolean }): Promise<string> {
        if (!args.length) {
            if (!opts.silent)
                return "Kappa You need to specify a query (level name or ID).";
            else
                return;
        }

        let notes;

        if (opts.auto) {
            notes = args[1];
        } else if (!opts.auto && !isNaN(parseInt(args[0]))) {
            if (args.slice(1).length)
                notes = args.slice(1).join(" ");
        } else
            notes = null;

        let res = await client.req.addLevel(client, { userId: msg.userInfo.userId, userName: msg.userInfo.userName },
            opts.auto || notes ? args[0] : args.join(" "),
            notes
        );
        let sets: Settings = client.db.load("settings");

        switch (res.status) {
            case ResCode.NOT_FOUND:
                if (!opts.silent) return `Kappa Couldn't find a level matching that ${opts.auto ? "ID" : "query"} (is it unlisted?)`;

            case ResCode.ALREADY_ADDED:
                if (!opts.silent) return "Kappa That level is already in the queue.";

            case ResCode.MAX_PER_USER:
                if (!opts.silent) return `Kappa You have the max amount of levels in the queue (${sets.max_levels_per_user})`;

            case ResCode.FULL:
                if (!opts.silent) return `Kappa The queue is full (max ${sets.max_queue_size} levels)`;

            case ResCode.DISABLED:
                if (!opts.silent) return `Kappa Requests are disabled.${sets.first_time ? ` (enable in the dashboard, or use ${sets.prefix ?? client.config.prefix}toggle)` : ""}`;

            case ResCode.BLACKLISTED:
                if (!opts.silent) return "Kappa That level is blacklisted.";

            case ResCode.GLOBAL_BL:
                break;

            case ResCode.ERROR:
                return "An error occurred, please try again. (If the issue persists, please contact the developer)";

            case ResCode.OK: {
                if (opts.auto) client.logger.log(`Added level in channel: <channel>`);

                if (!opts.silent) return `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${client.db.load("levels", ).levels.length}`;
            }

            default:
                client.logger.warn("req case missing");
                return "the dev forgot what to put here ¯\\_(ツ)_/¯";
        }
    }
}
