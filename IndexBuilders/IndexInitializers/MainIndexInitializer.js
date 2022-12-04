import { IndexInitializerImobiliareRo } from './IndexInitializerImobiliareRo.js';
import { DataExtractorImobiliareRo } from '../../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../../Helpers/SmartRequester.js';
import {
    DB_COLLECTION_IMOBILIARE,
    SOURCE_IMOBILIARE_RO,
    REFERER_IMOBILIARE_RO,
    REFERRERS_IMOBILIARE_RO,
} from '../../Constants.js';
import { ImageHasher } from '../../Helpers/ImageHasher.js';
import { DbCollection } from '../../DbLayer/DbCollection.js';
import { DbClient } from '../../DbLayer/DbClient.js';
import { consoleLog, tryConnectToDatabase, tryDisconnectFromDatabase } from '../../Helpers/Utils.js';

export class MainIndexInitializer {
    constructor() {
        this.dbClient = null;
    }

    async init() {
        this.dbClient = new DbClient();

        if (!(await tryConnectToDatabase(this.dbClient))) {
            return;
        }

        await Promise.all([
            this.initializeIndexImobiliareRo(),
            // this.initializeOlxRoIndex(),
            // this.initializeStoriaRoIndex(),
            // this.initializeAnuntulRoIndex(),
        ]);

        if (!(await tryDisconnectFromDatabase(this.dbClient))) {
            return;
        }

        consoleLog('[reib] Initialization complete.');
    }

    async initializeIndexImobiliareRo() {
        const dbCollection = new DbCollection(DB_COLLECTION_IMOBILIARE, this.dbClient);
        const dataExtractor = new DataExtractorImobiliareRo();
        const imageHasher = new ImageHasher();
        const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
            authority: 'www.imobiliare.ro',
        });

        const initializer = new IndexInitializerImobiliareRo(
            SOURCE_IMOBILIARE_RO,
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