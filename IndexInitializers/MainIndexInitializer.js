import { IndexInitializerImobiliareRo } from './IndexInitializerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../Helpers/SmartRequester.js';
import {
    DB_COLLECTION_IMOBILIARE,
    LOGS_SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
} from '../Constants.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { DbClient } from '../DbLayer/DbClient.js';

export class MainIndexInitializer {
    constructor() {
        this.dbClient = null;
    }

    async init() {
        this.dbClient = new DbClient();
        await this.dbClient.connect();

        // TODO: Make a dummy query to MongoDB to test it is up and running (not down for maintenance etc.)

        await Promise.allSettled([
            this.initializeIndexImobiliareRo(),
            // this.initializeOlxRoIndex(),
            // this.initializeStoriaRoIndex(),
            // this.initializeAnuntulRoIndex(),
        ]);

        await this.dbClient.disconnect();
    }

    async initializeIndexImobiliareRo() {
        const dbCollection = new DbCollection(DB_COLLECTION_IMOBILIARE, this.dbClient);
        const dataExtractor = new DataExtractorImobiliareRo();
        const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
            authority: 'www.imobiliare.ro',
        });
        const imageHasher = new ImageHasher(smartRequester);

        const initializer = new IndexInitializerImobiliareRo(
            LOGS_SOURCE_IMOBILIARE_RO,
            dbCollection,
            dataExtractor,
            smartRequester,
            imageHasher
        );

        await initializer.start();
    }

    async initializeIndexOlxRo() {}

    async initializeIndexStoriaRo() {}

    async initializeIndexAnuntulRo() {}
}
