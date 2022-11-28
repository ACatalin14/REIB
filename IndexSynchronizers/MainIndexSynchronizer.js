import { IndexSynchronizerImobiliareRo } from './IndexSynchronizerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../Helpers/SmartRequester.js';
import {
    DB_COLLECTION_CLOSED_LISTINGS,
    DB_COLLECTION_IMOBILIARE,
    LOGS_SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
} from '../Constants.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { DbCollection } from '../DbLayer/DbCollection.js';

export class MainIndexSynchronizer {
    constructor(dbClient) {
        this.dbClient = dbClient;
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
