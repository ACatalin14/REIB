import { IndexSynchronizerImobiliareRo } from './IndexSynchronizerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../../Helpers/SmartRequester.js';
import {
    SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
    DB_COLLECTION_SYNC_STATS,
    DB_COLLECTION_APARTMENTS,
    DB_COLLECTION_LISTINGS,
    DB_COLLECTION_LIVE_LISTINGS,
    SOURCE_OLX_RO,
    REFERRERS_OLX_RO,
    REFERER_OLX_RO,
} from '../../Constants.js';
import { ImageHasher } from '../../Helpers/ImageHasher.js';
import { DbCollection } from '../../DbLayer/DbCollection.js';
import { DbClient } from '../../DbLayer/DbClient.js';
import { consoleLog } from '../../Helpers/Utils.js';
import { SimilarityDetector } from '../../Helpers/SimilarityDetector.js';
import { DbSubCollection } from '../../DbLayer/DbSubCollection.js';
import { DataExtractorOlxRo } from '../../DataExtractors/DataExtractorOlxRo.js';
import { IndexSynchronizerOlxRo } from './IndexSynchronizerOlxRo.js';

export class MainIndexSynchronizer {
    constructor() {
        this.dbClient = null;
        this.apartmentsCollection = null;
    }

    async sync() {
        this.dbClient = new DbClient();

        consoleLog('[main-synchronizer] Connecting to the database...');
        await this.dbClient.connect();

        this.apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        await this.syncIndexImobiliareRo();
        await this.syncIndexOlxRo();
        // await this.syncIndexStoriaRo();
        // await this.syncIndexAnuntulRo();

        consoleLog('[main-synchronizer] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[main-synchronizer] Synchronization complete.');
    }

    async syncIndexImobiliareRo() {
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
        const dbSyncStats = new DbCollection(DB_COLLECTION_SYNC_STATS, this.dbClient);

        const synchronizer = new IndexSynchronizerImobiliareRo(
            SOURCE_IMOBILIARE_RO,
            this.apartmentsCollection,
            listingsSubCollection,
            liveListingsSubCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            similarityDetector,
            dbSyncStats
        );

        await synchronizer.sync();
    }

    async syncIndexOlxRo() {
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
        const dbSyncStats = new DbCollection(DB_COLLECTION_SYNC_STATS, this.dbClient);

        const synchronizer = new IndexSynchronizerOlxRo(
            SOURCE_OLX_RO,
            this.apartmentsCollection,
            listingsSubCollection,
            liveListingsSubCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            similarityDetector,
            dbSyncStats
        );

        await synchronizer.sync();
    }

    async syncIndexStoriaRo() {}

    async syncIndexAnuntulRo() {}
}
