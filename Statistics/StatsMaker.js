import {
    DB_COLLECTION_APARTMENTS,
    DB_COLLECTION_LISTINGS,
    DB_COLLECTION_LIVE_LISTINGS,
    DB_COLLECTION_STATS,
    INDEX_TYPE_APARTMENTS,
    INDEX_TYPE_LISTINGS,
    INDEX_TYPE_SOLD_APARTMENTS,
    ONE_DAY,
    SOURCE_ANUNTUL_RO,
    SOURCE_IMOBILIARE_RO,
    SOURCE_OLX_RO,
    SOURCE_PUBLI24_RO,
} from '../Constants.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { consoleLog, mapObjectsToValueOfKey } from '../Helpers/Utils.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { Int32 } from 'mongodb';
import ObjectsToCsv from 'objects-to-csv';

export class StatsMaker {
    constructor() {
        this.startDate = new Date(process.env.STATS_PERIOD_START_DATE);
        this.endDate = new Date(process.env.STATS_PERIOD_END_DATE);
        this.dbClient = null;
    }

    async makeStats(saveToDatabase = true, handleDatabaseConnection = true) {
        const startDateString = this.startDate.toLocaleDateString('ro-RO');
        const endDateString = this.endDate.toLocaleDateString('ro-RO');
        consoleLog(`[stats] Started computing statistics for period ${startDateString} to ${endDateString}`);

        const listingsStats = await this.makeListingsStats();
        const apartmentsStats = await this.makeApartmentsStats();
        const soldApartmentsStats = await this.makeSoldApartmentsStats();
        const stats = [...listingsStats, ...apartmentsStats, ...soldApartmentsStats];

        await this.saveStatsToCsvFile(stats);

        if (saveToDatabase) {
            await this.saveToDatabaseCollection(stats, handleDatabaseConnection);
        }

        consoleLog('[stats] Computing statistics finished.');
    }

    async makeMonthlyStats() {
        consoleLog('[stats] Started computing monthly statistics.');

        const dynamicStartDate =
            this.startDate.getDate() === 1 &&
            this.startDate.getHours() === 0 &&
            this.startDate.getMinutes() === 0 &&
            this.startDate.getSeconds() === 0
                ? this.startDate
                : new Date(this.startDate.getFullYear(), 1 + this.startDate.getMonth(), 1, 0, 0, 0);

        let targetEndDate = new Date(this.endDate);
        targetEndDate.setSeconds(targetEndDate.getSeconds() + 1);
        targetEndDate.setDate(1);
        targetEndDate.setHours(23, 59, 59);
        targetEndDate = new Date(targetEndDate - ONE_DAY);

        consoleLog('[stats] Connecting to the database...');
        this.dbClient = new DbClient();
        await this.dbClient.connect();

        while (dynamicStartDate < targetEndDate) {
            this.startDate = dynamicStartDate;
            this.endDate = new Date(dynamicStartDate.getFullYear(), 1 + dynamicStartDate.getMonth(), 1, 23, 59, 59);
            this.endDate = new Date(this.endDate - ONE_DAY);

            await this.makeStats(false, false);

            dynamicStartDate.setMonth(1 + dynamicStartDate.getMonth());
        }

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[stats] Finished computing monthly statistics.');
    }

    async makeWeeklyStats() {
        consoleLog('[stats] Started computing weekly statistics.');

        let dynamicStartDate = this.startDate;

        if (
            this.startDate.getDay() !== 1 || // Not Monday
            this.startDate.getHours() !== 0 ||
            this.startDate.getMinutes() !== 0 ||
            this.startDate.getSeconds() !== 0
        ) {
            dynamicStartDate.setDate(dynamicStartDate.getDate() + 1);
            dynamicStartDate.setHours(0, 0, 0);
            while (dynamicStartDate.getDay() !== 1) {
                dynamicStartDate.setDate(dynamicStartDate.getDate() + 1);
            }
        }

        let targetEndDate = new Date(this.endDate);
        targetEndDate.setSeconds(targetEndDate.getSeconds() + 1);
        while (targetEndDate.getDay() !== 1) {
            targetEndDate.setDate(targetEndDate.getDate() - 1);
        }
        targetEndDate.setHours(23, 59, 59);
        targetEndDate = new Date(targetEndDate - ONE_DAY);

        consoleLog('[stats] Connecting to the database...');
        this.dbClient = new DbClient();
        await this.dbClient.connect();

        while (dynamicStartDate < targetEndDate) {
            this.startDate = dynamicStartDate;
            this.endDate = new Date(dynamicStartDate);
            this.endDate.setDate(this.endDate.getDate() + 7);
            this.endDate.setSeconds(this.endDate.getSeconds() - 1);

            await this.makeStats(false, false);

            dynamicStartDate.setDate(dynamicStartDate.getDate() + 7);
        }

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[stats] Finished computing weekly statistics.');
    }

    async makeDailyStats() {
        consoleLog('[stats] Started computing daily statistics.');

        let dynamicStartDate = this.startDate;
        let targetEndDate = new Date(this.endDate);

        if (this.startDate.getHours() !== 0 || this.startDate.getMinutes() !== 0 || this.startDate.getSeconds() !== 0) {
            dynamicStartDate.setDate(dynamicStartDate.getDate() + 1);
            dynamicStartDate.setHours(0, 0, 0);
        }

        if (this.endDate.getHours() !== 23 || this.endDate.getMinutes() !== 59 || this.endDate.getSeconds() !== 59) {
            targetEndDate.setDate(targetEndDate.getDate() - 1);
            targetEndDate.setHours(23, 59, 59);
        }

        consoleLog('[stats] Connecting to the database...');
        this.dbClient = new DbClient();
        await this.dbClient.connect();

        while (dynamicStartDate < targetEndDate) {
            this.startDate = dynamicStartDate;
            this.endDate = new Date(dynamicStartDate);
            this.endDate.setHours(23, 59, 59);

            await this.makeStats(false, false);

            dynamicStartDate.setDate(dynamicStartDate.getDate() + 1);
        }

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[stats] Finished computing daily statistics.');
    }

    async makeRatiosStats() {
        consoleLog('[stats] Connecting to the database...');
        this.dbClient = new DbClient();
        await this.dbClient.connect();

        const results = [];

        const extraFiltersList = [
            {},
            { source: SOURCE_IMOBILIARE_RO },
            { source: SOURCE_OLX_RO },
            { source: SOURCE_PUBLI24_RO },
            { source: SOURCE_ANUNTUL_RO },
        ];

        for (let extraFilters of extraFiltersList) {
            consoleLog(`[stats] Fetching ratios for ${extraFilters.source ?? 'all apartments'}...`);

            const result = await this.getAggregationResultForRatio(extraFilters);

            results.push({
                source: extraFilters.source ?? null,
                ...result,
            });
        }

        const csv = new ObjectsToCsv(results);
        await csv.toDisk(`./Statistics/Results/${process.env.STATS_RESULTS_FILE_NAME}`, { append: true });

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();
    }

    async makeListingsStats() {
        consoleLog('[stats] Computing listings statistics...');

        const results = [];

        const extraFiltersList = [
            {},
            { roomsCount: 1 },
            { roomsCount: 2 },
            { roomsCount: 3 },
            { roomsCount: 4 },
            { hasNewApartment: true },
            { hasNewApartment: false },
            { roomsCount: 1, hasNewApartment: true },
            { roomsCount: 1, hasNewApartment: false },
            { roomsCount: 2, hasNewApartment: true },
            { roomsCount: 2, hasNewApartment: false },
            { roomsCount: 3, hasNewApartment: true },
            { roomsCount: 3, hasNewApartment: false },
            { roomsCount: 4, hasNewApartment: true },
            { roomsCount: 4, hasNewApartment: false },
        ];

        for (let extraFilters of extraFiltersList) {
            const result = await this.getAggregationResultForListings(extraFilters);
            delete result._id;
            result.roomsCount = extraFilters.roomsCount ? extraFilters.roomsCount : null;
            result.newApartment = extraFilters.hasNewApartment ?? null;
            result.indexType = INDEX_TYPE_LISTINGS;
            result.startDate = this.startDate;
            result.endDate = this.endDate;
            results.push(result);
        }

        return results;
    }

    async makeApartmentsStats() {
        consoleLog('[stats] Computing apartments statistics...');

        const results = [];

        const extraFiltersList = [
            {},
            { roomsCount: 1 },
            { roomsCount: 2 },
            { roomsCount: 3 },
            { roomsCount: 4 },
            { isNew: true },
            { isNew: false },
            { roomsCount: 1, isNew: true },
            { roomsCount: 1, isNew: false },
            { roomsCount: 2, isNew: true },
            { roomsCount: 2, isNew: false },
            { roomsCount: 3, isNew: true },
            { roomsCount: 3, isNew: false },
            { roomsCount: 4, isNew: true },
            { roomsCount: 4, isNew: false },
        ];

        for (let extraFilters of extraFiltersList) {
            const result = await this.getAggregationResultForApartments(extraFilters);
            delete result._id;
            result.roomsCount = extraFilters.roomsCount ? extraFilters.roomsCount : null;
            result.newApartment = extraFilters.isNew ?? null;
            result.indexType = INDEX_TYPE_APARTMENTS;
            result.startDate = this.startDate;
            result.endDate = this.endDate;
            results.push(result);
        }

        return results;
    }

    async makeSoldApartmentsStats() {
        consoleLog('[stats] Computing sold apartments statistics...');

        const results = [];

        const extraFiltersList = [
            {},
            { roomsCount: 1 },
            { roomsCount: 2 },
            { roomsCount: 3 },
            { roomsCount: 4 },
            { isNew: true },
            { isNew: false },
            { roomsCount: 1, isNew: true },
            { roomsCount: 1, isNew: false },
            { roomsCount: 2, isNew: true },
            { roomsCount: 2, isNew: false },
            { roomsCount: 3, isNew: true },
            { roomsCount: 3, isNew: false },
            { roomsCount: 4, isNew: true },
            { roomsCount: 4, isNew: false },
        ];

        for (let extraFilters of extraFiltersList) {
            const result = await this.getAggregationResultForSoldApartments(extraFilters);
            delete result._id;
            result.roomsCount = extraFilters.roomsCount ? extraFilters.roomsCount : null;
            result.newApartment = extraFilters.isNew ?? null;
            result.indexType = INDEX_TYPE_SOLD_APARTMENTS;
            result.startDate = this.startDate;
            result.endDate = this.endDate;
            results.push(result);
        }

        return results;
    }

    async saveStatsToCsvFile(stats) {
        stats = stats.map((stat) => ({
            startDate: stat.startDate.toLocaleDateString('ro-RO'),
            endDate: stat.endDate.toLocaleDateString('ro-RO'),
            indexType: stat.indexType,
            roomsCount: stat.roomsCount,
            newApartment: stat.newApartment === true ? 1 : stat.newApartment === false ? 0 : null,
            avgPrice: stat.avgPrice,
            avgPricePerSurface: stat.avgPricePerSurface,
        }));

        const csv = new ObjectsToCsv(stats);
        await csv.toDisk(`./Statistics/Results/${process.env.STATS_RESULTS_FILE_NAME}`, { append: true });
    }

    async saveToDatabaseCollection(stats, handleDatabaseConnection) {
        if (handleDatabaseConnection) {
            consoleLog('[stats] Connecting to the database...');
            this.dbClient = new DbClient();
            await this.dbClient.connect();
        }

        const statsCollection = new DbCollection(DB_COLLECTION_STATS, this.dbClient);

        await statsCollection.insertMany(stats);

        if (handleDatabaseConnection) {
            consoleLog('[stats] Disconnecting from the database...');
            await this.dbClient.disconnect();
        }
    }

    async getAggregationResultForListings(extraFilters) {
        const listingsCollection = new DbCollection(DB_COLLECTION_LISTINGS, this.dbClient);

        const results = await listingsCollection.aggregate([
            {
                $set:
                    extraFilters.roomsCount === 4
                        ? {
                              roomsCount: {
                                  $cond: {
                                      if: { $lt: ['$roomsCount', 4] },
                                      then: '$roomsCount',
                                      else: Int32(4),
                                  },
                              },
                          }
                        : { a: false }, // Set dummy field so roomsCount is not overwritten, so roomsCount index is used
            },
            {
                $match: {
                    ...extraFilters,
                    'versions.publishDate': { $lte: this.endDate },
                    $or: [{ 'versions.closeDate': null }, { 'versions.closeDate': { $gte: this.startDate } }],
                },
            },
            {
                $set: {
                    version: {
                        $last: {
                            $filter: {
                                input: '$versions',
                                as: 'version',
                                cond: {
                                    $and: [
                                        { $lte: ['$$version.publishDate', this.endDate] },
                                        {
                                            $or: [
                                                { $eq: ['$$version.closeDate', null] },
                                                { $gte: ['$$version.closeDate', this.startDate] },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
            { $unset: 'versions' },
            {
                $set: {
                    price: '$version.price',
                    pricePerSurface: { $round: [{ $divide: ['$version.price', '$version.surface'] }, 2] },
                },
            },
            {
                $group: {
                    _id: null,
                    avgPrice: { $avg: '$price' },
                    avgPricePerSurface: { $avg: '$pricePerSurface' },
                },
            },
            {
                $set: {
                    avgPrice: { $round: ['$avgPrice', 2] },
                    avgPricePerSurface: { $round: ['$avgPricePerSurface', 2] },
                },
            },
        ]);

        return results[0];
    }

    async getAggregationResultForApartments(extraFilters) {
        const apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        const results = await apartmentsCollection.aggregate([
            {
                $set:
                    extraFilters.roomsCount === 4
                        ? {
                              roomsCount: {
                                  $cond: {
                                      if: { $lt: ['$roomsCount', 4] },
                                      then: '$roomsCount',
                                      else: Int32(4),
                                  },
                              },
                          }
                        : { a: false }, // Set dummy field so roomsCount is not overwritten, so roomsCount index is used
            },
            {
                $lookup: {
                    from: 'listings',
                    localField: 'listings',
                    foreignField: '_id',
                    as: 'listings',
                },
            },
            {
                $project: {
                    roomsCount: 1,
                    isNew: 1,
                    'listings.versions.publishDate': 1,
                    'listings.versions.closeDate': 1,
                    'listings.versions.price': 1,
                    'listings.versions.surface': 1,
                },
            },
            // Match candidate apartments for the reference period
            {
                $match: {
                    ...extraFilters,
                    'listings.versions.publishDate': { $lte: this.endDate },
                    $or: [
                        { 'listings.versions.closeDate': null },
                        { 'listings.versions.closeDate': { $gte: this.startDate } },
                    ],
                },
            },
            // Filter listings that are relevant to the reference period
            {
                $set: {
                    listings: {
                        $filter: {
                            input: '$listings',
                            as: 'listing',
                            cond: {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: '$$listing.versions',
                                                as: 'version',
                                                cond: {
                                                    $and: [
                                                        { $lte: ['$$version.publishDate', this.endDate] },
                                                        {
                                                            $or: [
                                                                { $eq: ['$$version.closeDate', null] },
                                                                { $gte: ['$$version.closeDate', this.startDate] },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            },
            // Filter out possible misleading results
            {
                $match: {
                    'listings.0': { $exists: true },
                },
            },
            // Map relevant listings to their last version observed during the reference period
            {
                $set: {
                    versions: {
                        $map: {
                            input: '$listings',
                            as: 'listing',
                            in: {
                                $last: {
                                    $filter: {
                                        input: '$$listing.versions',
                                        as: 'version',
                                        cond: {
                                            $and: [
                                                { $lte: ['$$version.publishDate', this.endDate] },
                                                {
                                                    $or: [
                                                        { $eq: ['$$version.closeDate', null] },
                                                        { $gte: ['$$version.closeDate', this.startDate] },
                                                    ],
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            // Set the minimum price and surface between all available listings
            {
                $set: {
                    price: {
                        $min: {
                            $map: {
                                input: '$versions',
                                as: 'version',
                                in: '$$version.price',
                            },
                        },
                    },
                    surface: {
                        $min: {
                            $map: {
                                input: '$versions',
                                as: 'version',
                                in: '$$version.surface',
                            },
                        },
                    },
                },
            },
            {
                $set: {
                    pricePerSurface: { $round: [{ $divide: ['$price', '$surface'] }, 2] },
                },
            },
            // Average obtained results
            {
                $group: {
                    _id: null,
                    avgPrice: { $avg: '$price' },
                    avgPricePerSurface: { $avg: '$pricePerSurface' },
                },
            },
            {
                $set: {
                    avgPrice: { $round: ['$avgPrice', 2] },
                    avgPricePerSurface: { $round: ['$avgPricePerSurface', 2] },
                },
            },
        ]);

        return results[0];
    }

    async getAggregationResultForSoldApartments(extraFilters) {
        const apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        const results = await apartmentsCollection.aggregate([
            {
                $set:
                    extraFilters.roomsCount === 4
                        ? {
                              roomsCount: {
                                  $cond: {
                                      if: { $lt: ['$roomsCount', 4] },
                                      then: '$roomsCount',
                                      else: Int32(4),
                                  },
                              },
                          }
                        : { a: false }, // Set dummy field so roomsCount is not overwritten, so roomsCount index is used
            },
            {
                $lookup: {
                    from: 'listings',
                    localField: 'listings',
                    foreignField: '_id',
                    as: 'listings',
                },
            },
            {
                $project: {
                    roomsCount: 1,
                    isNew: 1,
                    'listings.versions.publishDate': 1,
                    'listings.versions.closeDate': 1,
                    'listings.versions.price': 1,
                    'listings.versions.surface': 1,
                    'listings.versions.sold': 1,
                },
            },
            // Match candidate apartments for the reference period
            {
                $match: {
                    ...extraFilters,
                    'listings.versions.publishDate': { $lte: this.endDate },
                    'listings.versions.closeDate': { $gte: this.startDate },
                    'listings.versions.sold': true,
                },
            },
            // Get number of listings that are sold during the reference period
            {
                $set: {
                    referenceListingsCount: {
                        $size: {
                            $filter: {
                                input: '$listings',
                                as: 'listing',
                                cond: {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: '$$listing.versions',
                                                    as: 'version',
                                                    cond: {
                                                        $and: [
                                                            { $lte: ['$$version.publishDate', this.endDate] },
                                                            { $ne: ['$$version.closeDate', null] },
                                                            { $gte: ['$$version.closeDate', this.startDate] },
                                                            { $eq: ['$$version.sold', true] },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                },
            },
            // Filter out apartments that are not sold during the reference period
            {
                $match: {
                    referenceListingsCount: { $gt: 0 },
                },
            },
            // Filter the listings that have been sold in any moment for the relevant apartments
            {
                $set: {
                    listings: {
                        $filter: {
                            input: '$listings',
                            as: 'listing',
                            cond: {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: '$$listing.versions',
                                                as: 'version',
                                                cond: { $eq: ['$$version.sold', true] },
                                            },
                                        },
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            },
            // Map all sold listings of the relevant apartments to their sold versions
            {
                $set: {
                    versions: {
                        $map: {
                            input: '$listings',
                            as: 'listing',
                            in: {
                                $last: {
                                    $filter: {
                                        input: '$$listing.versions',
                                        as: 'version',
                                        cond: { $eq: ['$$version.sold', true] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            // Set the minimum price and surface between all available listings
            {
                $set: {
                    price: {
                        $min: {
                            $map: {
                                input: '$versions',
                                as: 'version',
                                in: '$$version.price',
                            },
                        },
                    },
                    surface: {
                        $min: {
                            $map: {
                                input: '$versions',
                                as: 'version',
                                in: '$$version.surface',
                            },
                        },
                    },
                },
            },
            {
                $set: {
                    pricePerSurface: { $round: [{ $divide: ['$price', '$surface'] }, 2] },
                },
            },
            // Average obtained results
            {
                $group: {
                    _id: null,
                    avgPrice: { $avg: '$price' },
                    avgPricePerSurface: { $avg: '$pricePerSurface' },
                },
            },
            {
                $set: {
                    avgPrice: { $round: ['$avgPrice', 2] },
                    avgPricePerSurface: { $round: ['$avgPricePerSurface', 2] },
                },
            },
        ]);

        return results[0];
    }

    async getAggregationResultForRatio(extraFilters) {
        const liveListingsCollection = new DbCollection(DB_COLLECTION_LIVE_LISTINGS, this.dbClient);
        const listingsCollection = new DbCollection(DB_COLLECTION_LISTINGS, this.dbClient);
        const apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, this.dbClient);

        const liveListings = await liveListingsCollection.find(extraFilters, { projection: { _id: 0, id: 1 } });
        const liveListingsIds = mapObjectsToValueOfKey(liveListings, 'id');
        let listings = await listingsCollection.find(
            { id: { $in: liveListingsIds } },
            { projection: { _id: 1, id: 1 } }
        );

        const idsSet = new Set(listings.map((doc) => doc.id));

        listings = listings.reverse().filter((listing) => {
            if (idsSet.has(listing.id)) {
                idsSet.delete(listing.id);
                return true;
            }
            return false;
        });

        const listingsIds = mapObjectsToValueOfKey(listings, '_id');

        const listingsCount = listingsIds.length;
        const apartmentsCount = await apartmentsCollection.count({ listings: { $in: listingsIds } });

        return {
            listingsCount,
            apartmentsCount,
            ratio: Math.round((listingsCount / apartmentsCount) * 100) / 100,
        };
    }
}
