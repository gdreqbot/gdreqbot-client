import Gdreqbot from "../modules/Bot";
import BaseCommand, { Response } from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import { getUser } from "../apis/twitch";
import { getLevel } from "../apis/gd";

export = class BlacklistCommand extends BaseCommand {
    constructor() {
        super({
            name: "blacklist",
            description: "Manage blacklisted users or levels",
            args: "user|level add|remove|list|clear [<arg>]",
            aliases: ["bl", "blist"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<Response> {
        let blacklist: Blacklist = client.db.load("blacklist");

        if (!args.length || (!["user", "level"].includes(args[0]))) return { path: "blacklist.invalid_bl" };
        if (!["add", "remove", "clear", "list"].includes(args[1])) return { path: "blacklist.invalid_action" };
        if (!args[2] && (!["clear", "list"].includes(args[1]))) return { path: "blacklist.no_args", data: { type: args[0] } };

        switch (args[1]) {
            case "add": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return { path: "blacklist.error", data: { type: args[0] } };
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return { path: "blacklist.not_found", data: { type: args[0] } };

                let data: any;
                let str: string;
                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };
                    if (blacklist.users.some(u => u.userId == data.userId)) return { path: "blacklist.not_found", data: { type: args[0] } };

                    blacklist.users.push(data);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);
                    if (blacklist.levels?.some(l => l.id == data.id)) return { path: "blacklist.not_found", data: { type: args[0] } };

                    blacklist.levels ? blacklist.levels.push(data) : blacklist.levels = [data];
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", blacklist);
                return {
                    path: "blacklist.add",
                    data: {
                        str,
                        type: args[0]
                    }
                }
            }

            case "remove": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return { path: "blacklist.error", data: { type: args[0] } };
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return { path: "blacklist.not_found", data: { type: args[0] } };

                let idx: number;
                let data: any;
                let str: string;

                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };

                    idx = blacklist.users.findIndex(u => u.userId == data.userId);
                    if (idx == -1) return { path: "blacklist.not_bl", data: { type: args[0] } };

                    blacklist.users.splice(idx, 1);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);

                    idx = blacklist.levels?.findIndex(l => l.id == data.id);
                    if (idx == -1) return { path: "blacklist.not_bl", data: { type: args[0] } };

                    blacklist.levels.splice(idx, 1);
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", blacklist);
                return {
                    path: "blacklist.remove",
                    data: {
                        str,
                        type: args[0]
                    }
                }
            }

            case "clear": {
                await client.db.save("blacklist", args[0] == "user" ? { users: [] } : { levels: [] });

                return { path: "blacklist.clear", data: { type: args[0] } };
            }

            case "list": {
                let page = parseInt(args[2]);
                if (args[2] && isNaN(page))
                    return { path: "generic.nan" };

                let bl = args[0] == "user" ? blacklist.users : blacklist.levels;

                if (!bl?.length) return { path: "blacklist.empty", data: { type: args[0] } };

                let pages = [];
                let done = false;
                let start = 0;
                let end = bl.length >= 10 ? 10 : bl.length;
                let pos = 0;

                while (!done) {
                    let list = bl.slice(start, end);
                    if (!list.length) {
                        done = true;
                        break;
                    }

                    pages.push(list.map((l: any) => {
                        pos++;
                        return args[0] == "user" ? l.userName : `'${l.name}' (${l.id})`;
                    }));

                    start += 10;
                    end += blacklist.users.length > start ? 10 : 0;

                    if (start > end) done = true;
                }

                if (page > pages.length)
                    return { path: "generic.page_overflow" };

                return {
                    path: "blacklist.list",
                    data: {
                        page: page || "1",
                        pages: pages.length,
                        size: bl.length,
                        type: args[0],
                        list: pages[page ? page-1 : 0].join(" - ")
                    }
                }
            }
        }
    }
}
