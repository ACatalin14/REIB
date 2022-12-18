import { callUntilSuccess, consoleLog, getSyncDate } from '../Helpers/Utils.js';
import { load } from 'cheerio';
import { RETRY_IMAGES_FETCH_DELAY, RETRY_XML_FETCH_DELAY } from '../Constants.js';

export class IndexBuilder {
    constructor(
        source,
        apartmentsCollection,
        listingsSubCollection,
        liveListingsSubCollection,
        dataExtractor,
        smartRequester,
        imageHasher,
        similarityDetector
    ) {
        this.source = source;
        this.apartmentsCollection = apartmentsCollection;
        this.listingsSubCollection = listingsSubCollection;
        this.liveListingsSubCollection = liveListingsSubCollection;
        this.dataExtractor = dataExtractor;
        this.smartRequester = smartRequester;
        this.imageHasher = imageHasher;
        this.similarityDetector = similarityDetector;
        this.apartmentRecords = [];
    }

    getListingIdFromUrl(url) {
        // To be implemented
    }

    async fetchLiveListingsFromXml(xmlUrl) {
        // return [
        //     {
        //         url: 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/aviatiei/apartament-de-vanzare-3-camere-X17L1025O',
        //         id: 'X17L1025O',
        //         lastModified: new Date(),
        //     },
        //     {
        //         url: 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/aviatiei/apartament-de-vanzare-3-camere-X17L10118',
        //         id: 'X17L10118',
        //         lastModified: new Date(),
        //     }
        // ];
        let response;

        consoleLog(`[${this.source}] Fetching XML from: ${xmlUrl}`);

        response = await callUntilSuccess(
            this.smartRequester.get.bind(this.smartRequester),
            [xmlUrl],
            `[${this.source}] Error while fetching XML from: ${xmlUrl}.`,
            RETRY_XML_FETCH_DELAY
        );

        const $ = load(response.data, { xmlMode: true });
        let xmlListings = [];

        $('loc').each((index, element) => {
            const url = $(element).text();
            xmlListings[index] = {
                url: url,
                id: this.getListingIdFromUrl(url),
                lastModified: null,
            };
        });

        $('lastmod').each((index, element) => {
            xmlListings[index].lastModified = new Date($(element).text());
        });

        consoleLog(`[${this.source}] Found ${xmlListings.length} listings in XML.`);

        return xmlListings;
    }

    async fetchVersionDataFromLiveListing(liveListingData) {
        const versionData = await this.fetchVersionDataAndImageUrls(liveListingData);

        versionData.images = await callUntilSuccess(
            this.fetchBinHashesFromUrls.bind(this),
            [versionData.imageUrls],
            `[${this.source}] Cannot fetch all images due to possible bot detection.`,
            RETRY_IMAGES_FETCH_DELAY,
            3
        );

        delete versionData.imageUrls;

        return versionData;
    }

    async fetchVersionDataAndImageUrls(liveListingData) {
        let [browser, browserPage] = await this.smartRequester.getNewBrowserAndNewPage();

        try {
            consoleLog(`[${this.source}] Fetching listing page...`);
            const listingPageHtml = await this.fetchListingPage(liveListingData, browserPage);

            this.dataExtractor.setDataSource(listingPageHtml);

            const versionDetails = this.getVersionDetailsWithExtractor(liveListingData);

            consoleLog(`[${this.source}] Fetching listing image urls...`);

            const imageUrls = await this.dataExtractor.extractImageUrls(browserPage);

            return {
                ...versionDetails,
                imageUrls: imageUrls,
            };
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch listing details and image urls.`);
            throw error;
        } finally {
            await this.smartRequester.closeBrowser(browser);
        }
    }

    async fetchBinHashesFromUrls(urls) {
        consoleLog(`[${this.source}] Fetching images from urls...`);
        const images = await this.smartRequester.fetchImagesFromUrls(urls);
        return this.imageHasher.hashImages(images);
    }

    async fetchListingPage(liveListing, browserPage) {
        let htmlResponse;

        try {
            // TODO: Maybe check: browserPage !== null ? htmlResponse = getPageFromUrl() : apiResponse = get();
            htmlResponse = await this.smartRequester.getPageFromUrl(browserPage, liveListing.url);
            return htmlResponse;
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch listing HTML from: ${liveListing.url}.`);
            throw error;
        }
    }

    getVersionDetailsWithExtractor(liveListing) {
        if (!this.dataExtractor.hasValidListingDetails()) {
            throw new Error('Cannot find all listing details.');
        }

        const basePrice = this.dataExtractor.extractBasePrice();
        const hasSeparateTVA = this.dataExtractor.extractHasSeparateTVA();
        const hasMentionedTVA = this.dataExtractor.extractHasMentionedTVA();
        const roomsCount = this.dataExtractor.extractRoomsCount();
        const surface = this.dataExtractor.extractSurface();
        const zone = this.dataExtractor.extractZone();
        const constructionYear = this.dataExtractor.extractConstructionYear();
        const floor = this.dataExtractor.extractFloor();
        const hasCentralHeating = this.dataExtractor.extractHasCentralHeating();
        const hasNewApartment = this.dataExtractor.extractHasNewApartment(hasMentionedTVA, constructionYear);
        const price = this.dataExtractor.extractPrice(basePrice, surface, hasSeparateTVA);

        return {
            id: liveListing.id,
            url: liveListing.url,
            lastModified: new Date(liveListing.lastModified),
            hasNewApartment,
            roomsCount,
            zone,
            constructionYear,
            floor,
            hasCentralHeating,
            hasSeparateTVA,
            basePrice,
            price,
            surface,
        };
    }

    getNewListingDataFromVersionData(versionData) {
        return {
            id: versionData.id,
            url: versionData.url,
            hasNewApartment: versionData.hasNewApartment,
            roomsCount: versionData.roomsCount,
            zone: versionData.zone,
            constructionYear: versionData.constructionYear,
            floor: versionData.floor,
            hasCentralHeating: versionData.hasCentralHeating,
            images: versionData.images,
            apartment: null,
            versions: [
                {
                    publishDate: versionData.lastModified,
                    closeDate: null,
                    hasSeparateTVA: versionData.hasSeparateTVA,
                    basePrice: versionData.basePrice,
                    price: versionData.price,
                    surface: versionData.surface,
                    sold: false,
                },
            ],
        };
    }

    getUpdatedListingWithNewVersionData(listing, newVersionData) {
        const newVersion = {
            publishDate: getSyncDate(),
            closeDate: null,
            hasSeparateTVA: newVersionData.hasSeparateTVA,
            basePrice: newVersionData.basePrice,
            price: newVersionData.price,
            surface: newVersionData.surface,
            sold: false,
        };

        const oldVersions = [...listing.versions];
        const lastVersion = oldVersions.pop();

        lastVersion.closeDate = getSyncDate();

        return {
            id: listing.id,
            url: newVersionData.url,
            hasNewApartment: newVersionData.hasNewApartment,
            roomsCount: newVersionData.roomsCount,
            zone: newVersionData.zone ?? listing.zone,
            constructionYear: newVersionData.constructionYear ?? listing.constructionYear,
            floor: newVersionData.floor ?? listing.floor,
            hasCentralHeating: newVersionData.hasCentralHeating,
            images: this.similarityDetector.getUnionBetweenHashesLists(listing.images, newVersionData.images),
            apartment: listing.apartment,
            versions: [...oldVersions, lastVersion, newVersion],
        };
    }

    async insertNewListing(listingData) {
        try {
            const { insertedId } = await this.listingsSubCollection.insertOne(listingData);
            return insertedId;
        } catch (error) {
            consoleLog(`[${this.source}] Cannot insert listing data.`);
            consoleLog(error);
            return -1;
        }
    }

    async insertNewApartment(apartmentData) {
        try {
            const { insertedId } = await this.apartmentsCollection.insertOne(apartmentData);
            this.apartmentRecords.push({ _id: insertedId, ...apartmentData });
            return insertedId;
        } catch (error) {
            consoleLog(`[${this.source}] Cannot insert apartment data.`);
            consoleLog(error);
            return -1;
        }
    }

    async fetchSimilarApartmentForListing(listing) {
        if (this.apartmentRecords.length === 0) {
            this.apartmentRecords = await this.apartmentsCollection.find({}, {});
        }

        for (let i = 0; i < this.apartmentRecords.length; i++) {
            if (this.similarityDetector.checkListingRefersToApartment(listing, this.apartmentRecords[i])) {
                return this.apartmentRecords[i];
            }
        }

        return null;
    }

    async syncApartmentWithNewListing(apartment, listing) {
        listing.apartment = apartment._id;
        listing._id = await this.insertNewListing(listing);

        const images = this.similarityDetector.getUnionBetweenHashesLists(apartment.images, listing.images);
        const listings = [...apartment.listings, listing._id];

        await this.updateApartmentById(apartment._id, { images, listings });
    }

    async updateApartmentById(apartmentId, updateData) {
        const indexToUpdate = this.apartmentRecords.findIndex((apartment) => apartment._id === apartmentId);

        this.apartmentRecords[indexToUpdate] = {
            ...this.apartmentRecords[indexToUpdate],
            ...updateData,
        };

        await this.apartmentsCollection.updateOne({ _id: apartmentId }, { $set: updateData });
    }

    async deleteApartmentById(apartmentId) {
        const indexToDelete = this.apartmentRecords.findIndex((apartment) => apartment._id === apartmentId);

        this.apartmentRecords.splice(indexToDelete, 1);

        await this.apartmentsCollection.deleteOne({ _id: apartmentId });
    }

    async createApartmentForNewListing(listing) {
        const apartmentData = this.createApartmentDataFromListingData(listing);

        const apartmentId = await this.insertNewApartment(apartmentData);

        listing.apartment = apartmentId;
        listing._id = await this.insertNewListing(listing);

        await this.updateApartmentById(apartmentId, { listings: [listing._id] });
    }

    async createApartmentForExistingListing(listing) {
        const apartmentData = this.createApartmentDataFromListingData(listing);

        apartmentData.listings = [listing._id];

        listing.apartment = await this.insertNewApartment(apartmentData);

        await this.listingsSubCollection.updateOne({ id: listing.id }, { $set: listing });
    }

    createApartmentDataFromListingData(listingData) {
        return {
            roomsCount: listingData.roomsCount,
            isNew: listingData.hasNewApartment,
            images: listingData.images,
        };
    }

    async createNewListingWithApartmentHandlingFromVersionData(versionData) {
        const listingData = this.getNewListingDataFromVersionData(versionData);
        const similarApartment = await this.fetchSimilarApartmentForListing(listingData);

        if (similarApartment) {
            consoleLog(`[${this.source}] Syncing new listing with existing apartment [${similarApartment._id}]...`);
            await this.syncApartmentWithNewListing(similarApartment, listingData);
        } else {
            consoleLog(`[${this.source}] Creating apartment for new listing...`);
            await this.createApartmentForNewListing(listingData);
        }
    }

    async updateListingWithApartmentHandlingUsingNewVersionData(newVersionData) {
        const listing = await this.listingsSubCollection.findOne({ id: newVersionData.id }, {});
        const apartment = await this.apartmentsCollection.findOne({ _id: listing.apartment }, {});

        if (!this.listingVersionSignificantlyChanged(listing, newVersionData)) {
            consoleLog(`[${this.source}] Listing has not significantly changed. No need for update.`);
            return false;
        }

        if (newVersionData.roomsCount !== apartment.roomsCount || newVersionData.hasNewApartment !== apartment.isNew) {
            // Rare case: One of the most important attributes has changed, so must update linked apartment
            consoleLog(`[${this.source}] Updating apartment link for existing listing...`);
            await this.updateListingWhenLinkedApartmentChanges(listing, apartment, newVersionData);
            return true;
        }

        // Last version is referring to the same apartment as it was referring before the listing's update
        const updatedListing = this.getUpdatedListingWithNewVersionData(listing, newVersionData);

        await this.listingsSubCollection.updateOne({ id: updatedListing.id }, { $set: updatedListing });

        const updatedApartmentImages = this.similarityDetector.getUnionBetweenHashesLists(
            apartment.images,
            updatedListing.images
        );

        await this.updateApartmentById(updatedListing.apartment, { images: updatedApartmentImages });

        return true;
    }

    listingVersionSignificantlyChanged(listing, newVersion) {
        const oldVersions = [...listing.versions];
        const lastVersion = oldVersions.pop();

        return (
            newVersion.hasSeparateTVA !== lastVersion.hasSeparateTVA ||
            newVersion.basePrice !== lastVersion.basePrice ||
            newVersion.price !== lastVersion.price ||
            newVersion.surface !== lastVersion.surface
        );
    }

    async updateListingWhenLinkedApartmentChanges(listing, oldApartment, newVersionData) {
        // TODO: Add one more field for syncStats: apartmentLinkUpdateCounts
        // Handle old apartment
        const updatedApartmentListings = oldApartment.listings.filter(
            (apartmentListing) => apartmentListing !== listing._id
        );

        if (updatedApartmentListings.length > 0) {
            await this.removeLinkedListingFromApartment(oldApartment, listing);
        } else {
            await this.deleteApartmentById(oldApartment._id);
        }

        // Handle new apartment and listing
        const updatedListing = this.getUpdatedListingWithNewVersionData(listing, newVersionData);
        const similarApartment = await this.fetchSimilarApartmentForListing(updatedListing);

        if (similarApartment) {
            await this.addLinkedListingToApartment(similarApartment, updatedListing);
        } else {
            await this.createApartmentForExistingListing(updatedListing);
        }
    }

    async removeLinkedListingFromApartment(apartment, listing) {
        const updatedApartmentListings = apartment.listings.filter(
            (apartmentListing) => apartmentListing !== listing._id
        );

        const apartmentListings = await this.listingsSubCollection.find(
            { _id: { $in: updatedApartmentListings } },
            { unsetScope: true, projection: { _id: 0, images: 1 } }
        );

        const updatedApartmentImages = apartmentListings.reduce(
            (allImages, listing) => this.similarityDetector.getUnionBetweenHashesLists(allImages, listing.images),
            []
        );

        await this.updateApartmentById(apartment._id, {
            listings: updatedApartmentListings,
            images: updatedApartmentImages,
        });
    }

    async addLinkedListingToApartment(apartment, listing) {
        const updatedListings = [...apartment.listings, listing._id];
        const updatedImages = this.similarityDetector.getUnionBetweenHashesLists(apartment.images, listing.images);

        await this.updateApartmentById(apartment._id, {
            listings: updatedListings,
            images: updatedImages,
        });

        listing.apartment = apartment._id;

        await this.listingsSubCollection.updateOne({ id: listing.id }, { $set: listing });
    }
}
