import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Perm } from "../datasets/perms";
import { Settings } from "../datasets/settings";

export = class PermCommand extends BaseCommand {
    constructor() {
        super({
            name: "perm",
            description: "View your permission level",
            privilegeDesc: "Set required perms for a command",
            privilegeArgs: "set|reset <command> [<perm>]",
            aliases: ["permission", "permissions"],
            enabled: true,
            permLevel: PermLevels.BLACKLISTED,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, args: string[], opts: { userPerms: PermLevels, privilegeMode: boolean }): Promise<string> {
        if (!opts.privilegeMode)
            return `Your permission level is: ${PermLevels[opts.userPerms]}`;

        if (!args.length || (!["set", "reset"].includes(args[0]))) return "You must select a valid action (set|reset)";
        if (!args[1]) return "You must select a command.";
        let cmd = client.commands.get(args[1])
            || client.commands.values().find(c => c.config.aliases?.includes(args[1]));

        if (!cmd) return "That command doesn't exist.";

        let perms: Perm[] = client.db.load("perms", ).perms;
        let customPerms = perms.find(p => p.cmd == cmd.info.name);
        if ((customPerms?.perm || cmd.config.permLevel) > opts.userPerms) return "You can't manage commands that require a permission higher than yours.";

        let sets: Settings = client.db.load("settings", );

        switch (args[0]) {
            case "set": {
                if (!args[2]) return `You must select a permission to apply: ${Object.keys(PermLevels).filter(k => isNaN(Number(k))).join(" | ")}`;

                let perm = args[2].toUpperCase();
                if (!Object.keys(PermLevels).includes(perm)) return `Invalid permission, please select one of: ${Object.keys(PermLevels).filter(k => isNaN(Number(k))).join(" | ")}`;

                let value: PermLevels = (PermLevels as any)[perm];
                if (value > opts.userPerms) return "You can't set a permission higher than yours.";
                
                if (customPerms) {
                    customPerms.perm = value;
                } else {
                    perms.push({
                        cmd: cmd.info.name,
                        perm: value
                    });
                }

                await client.db.save("perms", { perms });
                `Set permission for ${sets.prefix ?? client.config.prefix}${cmd.info.name} to: ${perm}`;
                break;
            }

            case "reset": {
                if (customPerms) {
                    perms.splice(perms.findIndex(p => p.cmd == cmd.info.name), 1);
                    await client.db.save("perms", { perms });
                }

                `Reset ${sets.prefix ?? client.config.prefix}${cmd.info.name} to its default permission (${PermLevels[cmd.config.permLevel]})`;
                break;
            }
        }
    }
}
