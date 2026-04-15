import BaseCommand, { Response } from "../structs/BaseCommand";

export = class VersionCommand extends BaseCommand {
    constructor() {
        super({
            name: "version",
            description: "Gives the client version",
            enabled: true,
        });
    }

    async run(): Promise<Response> {
        return {
            path: "version.str",
            data: {
                platform: process.platform,
                version: require('../../package.json').version
            }
        };
    }
}
