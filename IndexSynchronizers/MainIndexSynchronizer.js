import { IndexSynchronizerImobiliareRo } from './IndexSynchronizerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../Helpers/SmartRequester.js';
import {
    DB_COLLECTION_CLOSED_LISTINGS,
    DB_COLLECTION_IMOBILIARE,
    SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
    START_DELAY,
    DB_COLLECTION_SYNC_STATS,
} from '../Constants.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import delay from 'delay';
import { DbClient } from '../DbLayer/DbClient.js';
import { consoleLog, tryConnectToDatabase, tryDisconnectFromDatabase } from '../Helpers/Utils.js';

export class MainIndexSynchronizer {
    constructor() {
        this.dbClient = null;
    }

    async sync() {
        // Start with a random delay (at most 10 mins)
        await delay(START_DELAY);

        this.dbClient = new DbClient();

        if (!(await tryConnectToDatabase(this.dbClient))) {
            return;
        }

        await this.syncIndexImobiliareRo();
        // await this.syncIndexOlxRo();
        // await this.syncIndexStoriaRo();
        // await this.syncIndexAnuntulRo();

        if (!(await tryDisconnectFromDatabase(this.dbClient))) {
            return;
        }

        consoleLog('[reib] Synchronization complete.');
    }

    async syncIndexImobiliareRo() {
        const dbCollection = new DbCollection(DB_COLLECTION_IMOBILIARE, this.dbClient);
        const dataExtractor = new DataExtractorImobiliareRo();
        const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
            authority: 'www.imobiliare.ro',
        });
        const imageHasher = new ImageHasher(smartRequester);
        const dbClosedListings = new DbCollection(DB_COLLECTION_CLOSED_LISTINGS, this.dbClient);
        const dbSyncStats = new DbCollection(DB_COLLECTION_SYNC_STATS, this.dbClient);

        const synchronizer = new IndexSynchronizerImobiliareRo(
            SOURCE_IMOBILIARE_RO,
            dbCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            dbClosedListings,
            dbSyncStats
        );

        await synchronizer.sync();
    }

    async syncIndexOlxRo() {}

    async syncIndexStoriaRo() {}

    async syncIndexAnuntulRo() {}
}
