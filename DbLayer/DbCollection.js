import { callUntilSuccess, useTestDb } from '../Helpers/Utils.js';
import { DB_REIB, DB_REIB_TEST, RETRY_DB_OPERATION_DELAY } from '../Constants.js';

export class DbCollection {
    constructor(name, dbClient) {
        this.name = name;
        this.dbClient = dbClient;
        this.errorMessage = 'Cannot execute database operation.';
    }

    getCollection() {
        const dbName = useTestDb() ? DB_REIB_TEST : DB_REIB;
        return this.dbClient.client.db(dbName).collection(this.name);
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

    async count(filter = {}, options = {}) {
        return await callUntilSuccess(
            this.countMethod.bind(this),
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

    async updateMany(filter, update, options = {}) {
        return await callUntilSuccess(
            this.updateManyMethod.bind(this),
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

    async countMethod(filter, options) {
        return await this.getCollection().count(filter, options);
    }

    async insertOneMethod(record) {
        return await this.getCollection().insertOne(record);
    }

    async insertManyMethod(records) {
        return await this.getCollection().insertMany(records);
    }

    async updateOneMethod(filter, update, options) {
        return await this.getCollection().updateOne(filter, update, options);
    }

    async updateManyMethod(filter, update, options) {
        return await this.getCollection().updateMany(filter, update, options);
    }

    async deleteOneMethod(filter) {
        return await this.getCollection().deleteOne(filter);
    }

    async deleteManyMethod(filter) {
        return await this.getCollection().deleteMany(filter);
    }
}
