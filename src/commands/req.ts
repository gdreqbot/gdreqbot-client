import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean, silent: boolean }): Promise<Response> {
        if (!args.length) {
            if (!opts.silent)
                return { path: "req.no_query" };
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
                if (!opts.silent) return { path: opts.auto ? "req.not_found.id" : "req.not_found.query" };

            case ResCode.ALREADY_ADDED:
                if (!opts.silent) return { path: "req.already_added" };

            case ResCode.MAX_PER_USER:
                if (!opts.silent) return { path: "req.max_per_user", data: { max_levels_per_user: sets.max_levels_per_user } };

            case ResCode.FULL:
                if (!opts.silent) return { path: "req.full", data: { max_queue_size: sets.max_queue_size } };

            case ResCode.DISABLED:
                if (!opts.silent) 
                    if (sets.first_time)
                        return { path: "req.disabled.first_time", data: { prefix: sets.prefix ?? client.config.prefix } };
                    else
                        return { path: "req.disabled.base" };

            case ResCode.BLACKLISTED:
                if (!opts.silent) return { path: "req.blacklisted" };

            case ResCode.GLOBAL_BL:
                break;

            case ResCode.ERROR:
                return { path: "generic.error" };

            case ResCode.OK: {
                if (opts.auto) client.logger.log(`Added level in channel: ${channel}`);

                if (!opts.silent)
                    return {
                        path: "req.ok",
                        data: {
                            name: res.level.name,
                            id: res.level.id,
                            creator: res.level.creator,
                            pos: client.db.load("levels").levels.length
                        }
                    }
                else
                    break;
            }

            default:
                client.logger.warn("req case missing");
                return { path: "generic.forgot" };
        }
    }
}
