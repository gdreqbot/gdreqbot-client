import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
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

    async run(client: Gdreqbot, msg: ChatMessage, args: string[]): Promise<string> {
        let blacklist: Blacklist = client.db.load("blacklist");

        if (!args.length || (!["user", "level"].includes(args[0]))) return "Select a valid blacklist (user or level)";
        if (!["add", "remove", "clear", "list"].includes(args[1])) return "Select a valid action (add|remove|list|clear)";
        if (!args[2] && (!["clear", "list"].includes(args[1]))) return `Specify a ${args[0]}.`;

        switch (args[1]) {
            case "add": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return `An error occurred fetching ${args[0]} data. Please try again.`;
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return `That ${args[0]} doesn't exist.`;

                let data: any;
                let str: string;
                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };
                    if (blacklist.users.some(u => u.userId == data.userId)) return "That user is already blacklisted.";

                    blacklist.users.push(data);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);
                    if (blacklist.levels?.some(l => l.id == data.id)) return "That level is already blacklisted.";

                    blacklist.levels ? blacklist.levels.push(data) : blacklist.levels = [data];
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", blacklist);
                `Added ${str} to the ${args[0]} blacklist.`;
                break;
            }

            case "remove": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return `An error occurred fetching ${args[0]} data. Please try again.`;
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return `That ${args[0]} doesn't exist.`;

                let idx: number;
                let data: any;
                let str: string;

                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };

                    idx = blacklist.users.findIndex(u => u.userId == data.userId);
                    if (idx == -1) return "That user isn't blacklisted.";

                    blacklist.users.splice(idx, 1);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);

                    idx = blacklist.levels?.findIndex(l => l.id == data.id);
                    if (idx == -1) return "That level isn't blacklisted.";

                    blacklist.levels.splice(idx, 1);
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", blacklist);
                `Removed ${str} from the ${args[0]} blacklist.`;
                break;
            }

            case "clear": {
                await client.db.save("blacklist", args[0] == "user" ? { users: [] } : { levels: [] });

                `Cleared the ${args[0]} blacklist.`;
                break;
            }

            case "list": {
                let page = parseInt(args[2]);
                if (args[2] && isNaN(page))
                    return "Kappa Sir that's not a number.";

                let bl = args[0] == "user" ? blacklist.users : blacklist.levels;

                if (!bl?.length) return `The ${args[0]} blacklist is empty.`;

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
                    return "Kappa There aren't that many pages.";

                return `Page ${page || "1"} of ${pages.length} (${bl.length} ${args[0]}s) | ${pages[page ? page-1 : 0].join(" - ")}`;
            }
        }
    }
}
