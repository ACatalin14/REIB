import 'mongodb';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { callUntilSuccess } from '../Helpers/Utils.js';
import { RETRY_DB_OPERATION_DELAY } from '../Constants.js';

export class DbClient {
    constructor() {
        this.client = null;
    }

    async connect() {
        return await callUntilSuccess(
            this.connectMethod.bind(this),
            [],
            'Cannot connect to MongoDB.',
            RETRY_DB_OPERATION_DELAY
        );
    }

    async disconnect() {
        return await callUntilSuccess(
            this.disconnectMethod.bind(this),
            [],
            'Cannot disconnect from MongoDB.',
            RETRY_DB_OPERATION_DELAY
        );
    }

    async connectMethod() {
        const user = process.env.MONGODB_USERNAME;
        const pass = process.env.MONGODB_PASSWORD;
        const uri = `mongodb+srv://${user}:${pass}@reib-cluster.1rf4ovx.mongodb.net/?retryWrites=true&w=majority`;

        this.client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1,
        });

        await this.client.connect();
    }

    async disconnectMethod() {
        await this.client.close();
        this.client = null;
    }
}
