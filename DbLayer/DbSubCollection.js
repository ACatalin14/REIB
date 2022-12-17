import { DbCollection } from './DbCollection.js';

export class DbSubCollection extends DbCollection {
    constructor(name, dbClient, scope) {
        super(name, dbClient);
        this.scope = scope;
    }

    async aggregateMethod(pipeline, options) {
        pipeline.splice(0, 0, { $match: this.scope });
        const cursor = await this.getCollection().aggregate(pipeline, options);
        return await cursor.toArray();
    }

    async findOneMethod(filter, options) {
        filter = { ...this.scope, ...filter };
        return await this.getCollection().findOne(filter, options);
    }

    async findMethod(filter, options) {
        filter = { ...this.scope, ...filter };

        if (options.unsetScope) {
            delete filter.scope;
            delete options.unsetScope;
        }

        const cursor = await this.getCollection().find(filter, options);
        return await cursor.toArray();
    }

    async insertOneMethod(record) {
        record = { ...this.scope, ...record };
        return await this.getCollection().insertOne(record);
    }

    async insertManyMethod(records) {
        records = records.map((record) => ({ ...this.scope, ...record }));
        return await this.getCollection().insertMany(records);
    }

    async updateOneMethod(filter, update, options) {
        filter = { ...this.scope, ...filter };
        return await this.getCollection().updateOne(filter, update, options);
    }

    async updateManyMethod(filter, update, options) {
        filter = { ...this.scope, ...filter };
        return await this.getCollection().updateMany(filter, update, options);
    }

    async deleteOneMethod(filter) {
        filter = { ...this.scope, ...filter };
        return await this.getCollection().deleteOne(filter);
    }

    async deleteManyMethod(filter) {
        filter = { ...this.scope, ...filter };
        return await this.getCollection().deleteMany(filter);
    }
}
