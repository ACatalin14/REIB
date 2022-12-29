import { consoleLog, getRandomRestingDelay } from '../../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import delay from 'delay';
import { RETRY_IMAGES_FETCH_PUBLI24_DELAY } from '../../Constants.js';

export class IndexInitializerPubli24Ro extends IndexInitializer {
    async start() {
        try {
            consoleLog(`[${this.source}] Initialization started.`);

            const liveListings = await this.fetchLiveListingsFromPubli24MainSite(false);
            const initializedListingsIdsSet = await this.fetchInitializedListingsIdsSet();
            const liveListingsToInit = this.getLiveListingsToInit(liveListings, initializedListingsIdsSet);
            await this.prepareDbForLiveListingsInit(liveListingsToInit, initializedListingsIdsSet);
            await this.handleLiveListingsToInitialize(liveListingsToInit);

            consoleLog(`[${this.source}] Initialization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue initialization due to error:`);
            consoleLog(error);
        }
    }

    async handleLiveListingsToInitialize(liveListings) {
        for (let i = 0; i < liveListings.length; i++) {
            let versionData;

            try {
                consoleLog(`[${this.source}] Fetching listing [${i + 1}] from: ${liveListings[i].url}`);
                versionData = await this.fetchVersionDataFromLiveListing(
                    liveListings[i],
                    RETRY_IMAGES_FETCH_PUBLI24_DELAY
                );
            } catch (error) {
                consoleLog(`[${this.source}] Cannot fetch listing data.`);
                consoleLog(error);
                await this.liveListingsSubCollection.deleteOne({ id: liveListings[i].id });
                continue;
            }

            await this.liveListingsSubCollection.updateOne(
                { id: liveListings[i].id },
                { $set: { lastModified: versionData.lastModified } }
            );

            await this.createNewListingWithApartmentHandlingFromVersionData(versionData);

            consoleLog(`[${this.source}] Fetched and saved listing successfully. Waiting...`);
            await delay(getRandomRestingDelay());
        }
    }
}
