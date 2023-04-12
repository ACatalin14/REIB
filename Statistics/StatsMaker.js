import {
    DB_COLLECTION_APARTMENTS,
    DB_COLLECTION_LISTINGS,
    DB_COLLECTION_STATS,
    INDEX_TYPE_APARTMENTS,
    INDEX_TYPE_LISTINGS,
    INDEX_TYPE_SOLD_APARTMENTS,
} from '../Constants.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { consoleLog } from '../Helpers/Utils.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { Int32 } from 'mongodb';
import ObjectsToCsv from 'objects-to-csv';

export class StatsMaker {
    constructor() {
        this.startDate = new Date(process.env.STATS_PERIOD_START_DATE);
        this.endDate = new Date(process.env.STATS_PERIOD_END_DATE);
        this.dbClient = null;
        this.statsCollection = null;
    }

    async makeStats() {
        this.dbClient = new DbClient();

        consoleLog('[stats] Computing statistics started.');

        consoleLog('[stats] Connecting to the database...');
        await this.dbClient.connect();

        this.statsCollection = new DbCollection(DB_COLLECTION_STATS, this.dbClient);

        const listingsStats = await this.makeListingsStats();
        const apartmentsStats = await this.makeApartmentsStats();
        const soldApartmentsStats = await this.makeSoldApartmentsStats();
        const stats = [...listingsStats, ...apartmentsStats, ...soldApartmentsStats];

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();

        await this.saveToCsvFile(stats);

        consoleLog('[stats] Computing statistics finished.');
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

        await this.statsCollection.insertMany(results);

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

        await this.statsCollection.insertMany(results);

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

        await this.statsCollection.insertMany(results);

        return results;
    }

    async saveToCsvFile(stats) {
        stats = stats.map((stat) => ({
            ...stat,
            newApartment: stat.newApartment === true ? 1 : (stat.newApartment === false ? 0 : null),
            startDate: stat.startDate.toLocaleDateString('ro-RO'),
            endDate: stat.endDate.toLocaleDateString('ro-RO'),
        }));

        const csv = new ObjectsToCsv(stats);
        await csv.toDisk(`./Statistics/${process.env.STATS_RESULTS_FILE_NAME}`, { append: true });
    }

    async getAggregationResultForListings(extraFilters) {
        const listingsCollection = new DbCollection(DB_COLLECTION_LISTINGS, this.dbClient);

        const results = await listingsCollection.aggregate([
            {
                $set: {
                    roomsCount: {
                        $cond: {
                            if: { $lt: ['$roomsCount', 4] },
                            then: '$roomsCount',
                            else: Int32(4),
                        },
                    },
                },
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
                $set: {
                    roomsCount: {
                        $cond: {
                            if: { $lt: ['$roomsCount', 4] },
                            then: '$roomsCount',
                            else: Int32(4),
                        },
                    },
                },
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
                $set: {
                    roomsCount: {
                        $cond: {
                            if: { $lt: ['$roomsCount', 4] },
                            then: '$roomsCount',
                            else: Int32(4),
                        },
                    },
                },
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
            // Get listings that are sold during the reference period
            {
                $set: {
                    referenceListings: {
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
            // Filter out apartments that are not sold during the reference period
            {
                $match: {
                    'referenceListings.0': { $exists: true },
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
}
