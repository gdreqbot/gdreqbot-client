import MapDB from "@galaxy05/map.db";
import { readdirSync } from "fs";
import Logger from "./Logger";

import { app } from "electron";
import { join } from "path";
const DEV = !app.isPackaged;

class Database {
    private db: MapDB;
    private logger: Logger;

    constructor(filename: string) {
        this.db = new MapDB(filename, { path: DEV ? "." : app.getPath("userData") });
        //this.db = new MapDB(filename);
        this.logger = new Logger("Database");
    }

    async init() {
        let datasets = readdirSync(DEV ? "./dist/datasets/" : join(process.resourcesPath, "./dist/datasets/")).filter(f => f.endsWith(".js"));
        for (const dataset of datasets) {
            let path = dataset.split(".")[0];

            if (!this.db.get(path)) {
                await this.save(path);
                this.logger.log(`Initialized ${path}`);
            }
        }

        this.logger.ready("Ready");
    }

    async clear() {
        return await this.db.clear();
    }

    load(path: string): any|null {
        return this.db.get(path) ?? null;
    }

    async save(path: string, newData?: any) {
        let data = this.load(path);
        if (!data)
            data = require(`../datasets/${path}.js`).defaultValues;

        const updated = Object.assign(structuredClone(data), newData);

        await this.db.set(path, updated);
        return updated;
    }

    async delete(path: string) {
        return await this.db.delete(path);
    }

    //private objQuery(data: any, query: any) {
    //    if (!data) return null;

    //    // imma fuckin genius
    //    let idx: number[] = [];
    //    let cb = (x: any, i: number) => {
    //        let obj: any = Object.entries(query); // [['id', '12345'], ['name', 'shish']]
    //        let match = true;
    //        for (let [key, value] of obj) {
    //            if (x[key] !== value) {
    //                match = false;
    //                break;
    //            }
    //        }
    //        
    //        if (match) idx.push(i);
    //        return match;
    //    };

    //    return { data: data.filter(cb), idx };
    //}
}

export default Database;
