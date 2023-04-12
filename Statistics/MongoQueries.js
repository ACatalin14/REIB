/**
 * This file contains a collection of multiple queries that can be run in the mongo shell
 */

let startDate = new Date("2023-02-01 00:00:00");
let endDate = new Date("2023-02-28 23:59:59");

db.getCollection("listings").aggregate([
    {
        $set: {
            roomsCount: {
                $cond: {
                    if: { $lt: ['$roomsCount', 4] },
                    then: '$roomsCount',
                    else: NumberInt(4),
                },
            },
        },
    },
    {
        $match: {
            roomsCount: 3,
            hasNewApartment: true,
            'versions.publishDate': { $lte: endDate },
            $or: [{ 'versions.closeDate': null }, { 'versions.closeDate': { $gte: startDate } }],
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
                                { $lte: ['$$version.publishDate', endDate] },
                                {
                                    $or: [
                                        { $eq: ['$$version.closeDate', null] },
                                        { $gte: ['$$version.closeDate', startDate] },
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

db.getCollection("apartments").aggregate([
    {
        $set: {
            roomsCount: {
                $cond: {
                    if: { $lt: ['$roomsCount', 4] },
                    then: '$roomsCount',
                    else: NumberInt(4),
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
            roomsCount: 3,
            isNew: true,
            'listings.versions.publishDate': { $lte: endDate },
            $or: [
                { 'listings.versions.closeDate': null },
                { 'listings.versions.closeDate': { $gte: startDate } },
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
                                                { $lte: ['$$version.publishDate', endDate] },
                                                {
                                                    $or: [
                                                        { $eq: ['$$version.closeDate', null] },
                                                        { $gte: ['$$version.closeDate', startDate] },
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
                                                { $gte: ['$$version.closeDate', startDate] },
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