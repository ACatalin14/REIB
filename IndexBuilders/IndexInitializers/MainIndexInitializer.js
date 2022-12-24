import { IndexInitializerImobiliareRo } from './IndexInitializerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../../Helpers/SmartRequester.js';
import {
    SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
    DB_COLLECTION_LIVE_LISTINGS,
    DB_COLLECTION_APARTMENTS,
    DB_COLLECTION_LISTINGS,
    SOURCE_OLX_RO,
    REFERRERS_OLX_RO,
    REFERER_OLX_RO,
} from '../../Constants.js';
import { ImageHasher } from '../../Helpers/ImageHasher.js';
import { DbCollection } from '../../DbLayer/DbCollection.js';
import { DbClient } from '../../DbLayer/DbClient.js';
import { consoleLog } from '../../Helpers/Utils.js';
import { DbSubCollection } from '../../DbLayer/DbSubCollection.js';
import { SimilarityDetector } from '../../Helpers/SimilarityDetector.js';
import { DataExtractorOlxRo } from '../../DataExtractors/DataExtractorOlxRo.js';
import { IndexInitializerOlxRo } from './IndexInitializerOlxRo.js';

export class MainIndexInitializer {
    constructor() {
        this.dbClient = null;
        this.apartmentsCollection = null;
    }

    async init() {
        this.dbClient = new DbClient();

        consoleLog('[main-initializer] Connecting to the database...');
        await this.dbClient.connect();

        this.apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        await this.initializeIndexImobiliareRo();
        await this.initializeIndexOlxRo();
        // await this.initializeStoriaRoIndex();
        // await this.initializeAnuntulRoIndex();

        consoleLog('[main-initializer] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[main-initializer] Initialization complete.');
    }

    async initializeIndexImobiliareRo() {
        const listingsSubCollection = new DbSubCollection(DB_COLLECTION_LISTINGS, this.dbClient, {
            source: SOURCE_IMOBILIARE_RO,
        });
        const liveListingsSubCollection = new DbSubCollection(DB_COLLECTION_LIVE_LISTINGS, this.dbClient, {
            source: SOURCE_IMOBILIARE_RO,
        });
        const dataExtractor = new DataExtractorImobiliareRo();
        const imageHasher = new ImageHasher();
        const similarityDetector = new SimilarityDetector(imageHasher);
        const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
            authority: 'www.imobiliare.ro',
        });

        const initializer = new IndexInitializerImobiliareRo(
            SOURCE_IMOBILIARE_RO,
            this.apartmentsCollection,
            listingsSubCollection,
            liveListingsSubCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            similarityDetector
        );

        await initializer.start();
    }

    async initializeIndexOlxRo() {
        const listingsSubCollection = new DbSubCollection(DB_COLLECTION_LISTINGS, this.dbClient, {
            source: SOURCE_OLX_RO,
        });
        const liveListingsSubCollection = new DbSubCollection(DB_COLLECTION_LIVE_LISTINGS, this.dbClient, {
            source: SOURCE_OLX_RO,
        });
        const dataExtractor = new DataExtractorOlxRo();
        const imageHasher = new ImageHasher();
        const similarityDetector = new SimilarityDetector(imageHasher);
        const smartRequester = new SmartRequester(REFERRERS_OLX_RO, REFERER_OLX_RO, {
            authority: 'www.olx.ro',
        });

        const initializer = new IndexInitializerOlxRo(
            SOURCE_OLX_RO,
            this.apartmentsCollection,
            listingsSubCollection,
            liveListingsSubCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            similarityDetector
        );

        await initializer.start();
    }

    async initializeIndexStoriaRo() {}

    async initializeIndexAnuntulRo() {}
}
