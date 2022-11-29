import { IndexSynchronizerImobiliareRo } from './IndexSynchronizerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../Helpers/SmartRequester.js';
import {
    DB_COLLECTION_CLOSED_LISTINGS,
    DB_COLLECTION_IMOBILIARE,
    LOGS_SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
    START_DELAY,
} from '../Constants.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import delay from 'delay';
import { DbClient } from '../DbLayer/DbClient.js';

export class MainIndexSynchronizer {
    constructor(dbClient) {
        this.dbClient = dbClient;
    }

    async sync() {
        // Start with a random delay (at most 10 mins)
        await delay(START_DELAY);

        this.dbClient = new DbClient();
        await this.dbClient.connect();

        // TODO: Make a test request to MongoDB to check it is up and running (not down for maintenance etc.)

        await this.syncIndexImobiliareRo();
        // await this.syncIndexOlxRo();
        // await this.syncIndexStoriaRo();
        // await this.syncIndexAnuntulRo();

        await this.dbClient.disconnect();
    }

    async syncIndexImobiliareRo() {
        const dbCollection = new DbCollection(DB_COLLECTION_IMOBILIARE, this.dbClient);
        const dataExtractor = new DataExtractorImobiliareRo();
        const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
            authority: 'www.imobiliare.ro',
        });
        const imageHasher = new ImageHasher(smartRequester);
        const dbClosedListings = new DbCollection(DB_COLLECTION_CLOSED_LISTINGS, this.dbClient);

        const synchronizer = new IndexSynchronizerImobiliareRo(
            LOGS_SOURCE_IMOBILIARE_RO,
            dbCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            dbClosedListings
        );

        await synchronizer.sync();
    }

    async syncIndexOlxRo() {}

    async syncIndexStoriaRo() {}

    async syncIndexAnuntulRo() {}
}
