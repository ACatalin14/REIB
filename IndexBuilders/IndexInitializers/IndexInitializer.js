import { IndexBuilder } from '../IndexBuilder.js';
import { consoleLog, getRandomRestingDelay, mapObjectsToValueOfKey } from '../../Helpers/Utils.js';
import delay from 'delay';

export class IndexInitializer extends IndexBuilder {
    async start() {
        // To be implemented
    }

    async getXmlListingsToInit(xmlListings) {
        const initializedListingsIds = await this.dbMarketListings.find(
            { price: { $exists: true } },
            { projection: { _id: 0, id: 1 } }
        );

        const initializedListingsIdsSet = new Set(mapObjectsToValueOfKey(initializedListingsIds, 'id'));

        return xmlListings.filter((xmlListing) => !initializedListingsIdsSet.has(xmlListing.id));
    }

    async prepareListingsToInit(xmlListings) {
        consoleLog(`[${this.source}] Preparing ${xmlListings.length} listings to initialize...`);

        // Delete uninitialized listings
        await this.dbMarketListings.deleteMany({ price: { $exists: false } });

        // Insert listings to initialize
        const shortListingsToInsert = xmlListings.map((listing) => ({
            id: listing.id,
            lastModified: listing.lastModified,
        }));

        await this.dbMarketListings.insertMany(shortListingsToInsert);

        consoleLog(`[${this.source}] Listings prepared for initialization.`);
    }

    async handleXmlListingsToInitialize(xmlListings) {
        for (let i = 0; i < xmlListings.length; i++) {
            let listingData;

            try {
                consoleLog(`[${this.source}] Fetching listing [${i + 1}] from: ${xmlListings[i].url}`);
                listingData = await this.fetchListingDataFromPage(xmlListings[i]);
            } catch (error) {
                consoleLog(`[${this.source}] Cannot fetch listing data.`);
                consoleLog(error);
                await this.dbMarketListings.deleteOne({ id: xmlListings[i].id });
                continue;
            }

            try {
                await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
                consoleLog(`[${this.source}] Fetched and saved listing successfully. Waiting...`);
                await delay(getRandomRestingDelay());
            } catch (error) {
                consoleLog(`[${this.source}] Cannot update listing data from: ${xmlListings[i].url}`);
                consoleLog(error);
            }
        }
    }
}
