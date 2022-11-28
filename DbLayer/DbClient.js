import 'mongodb';
import { MongoClient, ServerApiVersion } from 'mongodb';

export class DbClient {
    constructor() {
        this.client = null;
    }

    async connect() {
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

    async disconnect() {
        await this.client.close();
        this.client = null;
    }
}
