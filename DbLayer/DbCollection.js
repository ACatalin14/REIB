import { callUntilSuccess } from '../Helpers/Utils.js';
import { RETRY_DB_OPERATION_DELAY } from '../Constants.js';

export class DbCollection {
    constructor(name, dbClient) {
        this.name = name;
        this.dbClient = dbClient;
        this.errorMessage = 'Cannot execute database operation.';
    }

    getCollection() {
        return this.dbClient.client.db('reib').collection(this.name);
    }

    async aggregate(pipeline = [], options = {}) {
        return await callUntilSuccess(
            this.aggregateMethod.bind(this),
            [pipeline, options],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async findOne(filter = {}, options = { projection: { _id: 0 } }) {
        return await callUntilSuccess(
            this.findOneMethod.bind(this),
            [filter, options],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async find(filter = {}, options = { projection: { _id: 0 } }) {
        return await callUntilSuccess(
            this.findMethod.bind(this),
            [filter, options],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async insertOne(record) {
        return await callUntilSuccess(
            this.insertOneMethod.bind(this),
            [record],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async insertMany(records) {
        return await callUntilSuccess(
            this.insertManyMethod.bind(this),
            [records],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async updateOne(filter, update, options = {}) {
        return await callUntilSuccess(
            this.updateOneMethod.bind(this),
            [filter, update, options],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async deleteOne(filter) {
        return await callUntilSuccess(
            this.deleteOneMethod.bind(this),
            [filter],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async deleteMany(filter = {}) {
        return await callUntilSuccess(
            this.deleteManyMethod.bind(this),
            [filter],
            this.errorMessage,
            RETRY_DB_OPERATION_DELAY
        );
    }

    async aggregateMethod(pipeline, options) {
        const cursor = await this.getCollection().aggregate(pipeline, options);
        return await cursor.toArray();
    }

    async findOneMethod(filter, options) {
        return await this.getCollection().findOne(filter, options);
    }

    async findMethod(filter, options) {
        const cursor = await this.getCollection().find(filter, options);
        return await cursor.toArray();
    }

    async insertOneMethod(record) {
        await this.getCollection().insertOne(record);
    }

    async insertManyMethod(records) {
        await this.getCollection().insertMany(records);
    }

    async updateOneMethod(filter, update, options) {
        await this.getCollection().updateOne(filter, update, options);
    }

    async deleteOneMethod(filter) {
        await this.getCollection().deleteOne(filter);
    }

    async deleteManyMethod(filter) {
        await this.getCollection().deleteMany(filter);
    }
}
