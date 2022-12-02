import { IndexBuilder } from '../IndexBuilders/IndexBuilder.js';
import { consoleLog, mapObjectsToValueOfKey } from '../Helpers/Utils.js';

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
}
