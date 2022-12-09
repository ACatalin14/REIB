import { consoleLog } from '../Helpers/Utils.js';
import { DB_COLLECTION_DISTINCT_LISTINGS, SOURCE_TO_DB_COLLECTION_MAP } from '../Constants.js';
import { DbCollection } from '../DbLayer/DbCollection.js';

export class DistinctIndexBuilder {
    constructor(dbClient, similarityDetector) {
        this.dbClient = dbClient;
        this.similarityDetector = similarityDetector;
        this.source = 'distinct-index';
        this.distinctListings = [];
    }

    async build() {
        consoleLog(`[${this.source}] Connecting to the database...`);
        await this.dbClient.connect();

        consoleLog(`[${this.source}] Distinct index builder started.`);

        const distinctListingsCollection = new DbCollection(DB_COLLECTION_DISTINCT_LISTINGS, this.dbClient);

        consoleLog(`[${this.source}] Emptying the distinct listings collection...`);
        await distinctListingsCollection.deleteMany();

        for (const [source, collection] of Object.entries(SOURCE_TO_DB_COLLECTION_MAP)) {
            consoleLog(`[${this.source}] Extracting listings from ${source} collection...`);
            await this.extractDistinctListingsFromCollection(source, collection);
        }

        await distinctListingsCollection.insertMany(this.distinctListings);

        consoleLog(`[${this.source}] Disconnecting from the database...`);
        await this.dbClient.disconnect();

        consoleLog(`[${this.source}] Distinct index builder finished.`);
    }

    async extractDistinctListingsFromCollection(source, collection) {
        const listingsCollection = new DbCollection(collection, this.dbClient);
        const listings = await listingsCollection.find();

        for (let i = 0; i < listings.length; i++) {
            let similarListing = null;

            for (let j = 0; j < this.distinctListings.length; j++) {
                if (this.similarityDetector.checkListingsAreSimilar(listings[i], this.distinctListings[j])) {
                    similarListing = this.distinctListings[j];
                    break;
                }
            }

            if (!similarListing) {
                this.distinctListings.push({ ...listings[i], source: source });
                continue;
            }

            listings[i].source = source;

            this.handleListingWithSimilarDistinctListing(listings[i], similarListing);
        }
    }

    handleListingWithSimilarDistinctListing(candidateListing, distinctListing) {
        const originalListing = this.similarityDetector.getOriginalListing(distinctListing, candidateListing);

        if (originalListing.id === distinctListing.id) {
            return;
        }

        const indexToUpdate = this.distinctListings.findIndex((listing) => listing.id === distinctListing.id);
        this.distinctListings[indexToUpdate] = originalListing;
    }
}
