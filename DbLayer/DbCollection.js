export class DbCollection {
    constructor(name, dbClient) {
        this.name = name;
        this.dbClient = dbClient;
    }

    getCollection() {
        return this.dbClient.client.db('reib').collection(this.name);
    }

    async findOne(filter = {}, options = { projection: { _id: 0 } }) {
        return await this.getCollection().findOne(filter, options);
    }

    async find(filter = {}, options = { projection: { _id: 0 } }) {
        const cursor = await this.getCollection().find(filter, options);
        return await cursor.toArray();
    }

    async insertOne(record) {
        await this.getCollection().insertOne(record);
    }

    async insertMany(records) {
        await this.getCollection().insertMany(records);
    }

    async updateOne(filter, update, options = {}) {
        await this.getCollection().updateOne(filter, update, options);
    }

    async deleteOne(filter) {
        await this.getCollection().deleteOne(filter);
    }

    async deleteMany(filter = {}) {
        await this.getCollection().deleteMany(filter);
    }

    async aggregate(pipeline = [], options = {}) {
        const cursor = await this.getCollection().aggregate(pipeline, options);
        return await cursor.toArray();
    }
}
