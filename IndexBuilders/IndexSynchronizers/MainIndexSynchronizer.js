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
    SOURCE_ANUNTUL_RO,
    REFERRERS_ANUNTUL_RO,
    REFERER_ANUNTUL_RO,
    SOURCE_PUBLI24_RO,
    REFERRERS_PUBLI24_RO,
    REFERER_PUBLI24_RO,
} from '../../Constants.js';
import { ImageHasher } from '../../Helpers/ImageHasher.js';
import { DbCollection } from '../../DbLayer/DbCollection.js';
import { DbClient } from '../../DbLayer/DbClient.js';
import { consoleLog } from '../../Helpers/Utils.js';
import { SimilarityDetector } from '../../Helpers/SimilarityDetector.js';
import { DbSubCollection } from '../../DbLayer/DbSubCollection.js';
import { DataExtractorOlxRo } from '../../DataExtractors/DataExtractorOlxRo.js';
import { IndexSynchronizerOlxRo } from './IndexSynchronizerOlxRo.js';
import { DataExtractorAnuntulRo } from '../../DataExtractors/DataExtractorAnuntulRo.js';
import { IndexSynchronizerAnuntulRo } from './IndexSynchronizerAnuntulRo.js';
import { DataExtractorPubli24Ro } from '../../DataExtractors/DataExtractorPubli24Ro.js';
import { IndexSynchronizerPubli24Ro } from './IndexSynchronizerPubli24Ro.js';

export class MainIndexSynchronizer {
    constructor() {
        this.dbClient = null;
        this.apartmentsCollection = null;
    }

    async sync(firstSourceToSync) {
        this.dbClient = new DbClient();

        consoleLog('[main-synchronizer] Connecting to the database...');
        await this.dbClient.connect();

        this.apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        switch (firstSourceToSync) {
            case SOURCE_IMOBILIARE_RO:
                await this.syncIndexImobiliareRo();
            // Fallthrough
            case SOURCE_OLX_RO:
                await this.syncIndexOlxRo();
            // Fallthrough
            case SOURCE_PUBLI24_RO:
                await this.syncIndexPubli24Ro();
            // Fallthrough
            case SOURCE_ANUNTUL_RO:
                await this.syncIndexAnuntulRo();
            // Fallthrough
            default:
            // Do nothing
        }

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

    async syncIndexPubli24Ro() {
        const listingsSubCollection = new DbSubCollection(DB_COLLECTION_LISTINGS, this.dbClient, {
            source: SOURCE_PUBLI24_RO,
        });
        const liveListingsSubCollection = new DbSubCollection(DB_COLLECTION_LIVE_LISTINGS, this.dbClient, {
            source: SOURCE_PUBLI24_RO,
        });
        const dataExtractor = new DataExtractorPubli24Ro();
        const imageHasher = new ImageHasher();
        const similarityDetector = new SimilarityDetector(imageHasher);
        const smartRequester = new SmartRequester(REFERRERS_PUBLI24_RO, REFERER_PUBLI24_RO, {
            authority: 'www.publi24.ro',
        });
        const dbSyncStats = new DbCollection(DB_COLLECTION_SYNC_STATS, this.dbClient);

        const synchronizer = new IndexSynchronizerPubli24Ro(
            SOURCE_PUBLI24_RO,
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

    async syncIndexAnuntulRo() {
        const listingsSubCollection = new DbSubCollection(DB_COLLECTION_LISTINGS, this.dbClient, {
            source: SOURCE_ANUNTUL_RO,
        });
        const liveListingsSubCollection = new DbSubCollection(DB_COLLECTION_LIVE_LISTINGS, this.dbClient, {
            source: SOURCE_ANUNTUL_RO,
        });
        const dataExtractor = new DataExtractorAnuntulRo();
        const imageHasher = new ImageHasher();
        const similarityDetector = new SimilarityDetector(imageHasher);
        const smartRequester = new SmartRequester(REFERRERS_ANUNTUL_RO, REFERER_ANUNTUL_RO, {
            authority: 'www.anuntul.ro',
        });
        const dbSyncStats = new DbCollection(DB_COLLECTION_SYNC_STATS, this.dbClient);

        const synchronizer = new IndexSynchronizerAnuntulRo(
            SOURCE_ANUNTUL_RO,
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
}
