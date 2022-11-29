import { consoleLog } from '../Helpers/Utils.js';
import { load } from 'cheerio';

export class IndexBuilder {
    constructor(logsSource, dbCollection, dataExtractor, smartRequester, imageHasher) {
        this.logsSource = logsSource;
        this.dbMarketListings = dbCollection;
        this.dataExtractor = dataExtractor;
        this.smartRequester = smartRequester;
        this.imageHasher = imageHasher;
    }

    async fetchListingsFromXml(xmlUrl) {
        // TODO: remove
        // return [
        //     {
        //         id: 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/aviatorilor/apartament-de-vanzare-3-camere-X1920008S',
        //         lastModified: new Date(),
        //     },
        // ];

        let response;

        try {
            response = await this.smartRequester.get(xmlUrl);
            consoleLog(`[${this.logsSource}] Full XML fetched successfully.`);
        } catch (error) {
            consoleLog(`[${this.logsSource}] Error while fetching XML from: ${xmlUrl}.`);
            consoleLog(error);
            return;
        }

        const $ = load(response.data, { xmlMode: true });
        let xmlListings = [];

        $('loc').each((index, element) => {
            xmlListings[index] = {
                id: $(element).text(),
                lastModified: null,
            };
        });

        $('lastmod').each((index, element) => {
            xmlListings[index].lastModified = new Date($(element).text());
        });

        // TODO: Change back to full array: return xmlListings;
        return [xmlListings[1834]];
    }

    async fetchListingDataFromPage(listingShortData, browserPage) {
        const listingData = await this.fetchListingDetailsAndImageUrls(listingShortData, browserPage);

        listingData.images = await this.imageHasher.fetchBinHashesFromUrls(listingData.imageUrls);

        delete listingData.imageUrls;

        consoleLog('Listing fetched successfully. Waiting...');

        return listingData;
    }

    async fetchListingDetailsAndImageUrls(listingShortData, browserPage) {
        const listingPageHtml = await this.fetchListingPage(listingShortData, browserPage);

        this.dataExtractor.setDataSource(listingPageHtml);

        const listingDetails = this.getListingDetailsWithExtractor(listingShortData);

        const imageUrls = await this.fetchListingImageUrls(listingShortData, browserPage);

        return {
            ...listingDetails,
            imageUrls: imageUrls,
        };
    }

    async fetchListingPage(listingShortData, browserPage) {
        let htmlResponse;

        try {
            consoleLog('Fetching HTML listing from:', listingShortData.id);
            // TODO: Maybe check: browserPage !== null ? htmlResponse = getPageFromUrl() : apiResponse = get();
            htmlResponse = await this.smartRequester.getPageFromUrl(browserPage, listingShortData.id);
            consoleLog(`Fetched successfully HTML listing.`);
            return htmlResponse;
        } catch (error) {
            consoleLog(`[${this.logsSource}] Cannot fetch listing HTML from: ${listingShortData.id}.`);
            throw error;
        }
    }

    getListingDetailsWithExtractor(listingShortData) {
        if (!this.dataExtractor.hasListingDetails()) {
            throw new Error(`[${this.logsSource}] Cannot find all listing details at: ${listingShortData.id}.`);
        }

        const price = this.dataExtractor.extractPrice();
        const surface = this.dataExtractor.extractSurface();
        const roomsCount = this.dataExtractor.extractRoomsCount();

        return {
            id: listingShortData.id,
            lastModified: new Date(listingShortData.lastModified),
            roomsCount: roomsCount,
            price: price,
            surface: surface,
            pricePerSurface: Math.round((price / surface) * 100) / 100,
        };
    }

    async fetchListingImageUrls(listingShortData, browserPage) {
        try {
            return await this.dataExtractor.extractImageUrls(browserPage);
        } catch (error) {
            consoleLog(`[${this.logsSource}] Cannot extract image URL's from listing: ${listingShortData.id}.`);
            consoleLog(error);
            throw error;
        }
    }

    async getNewBrowserAndNewPage() {
        let browser = await this.smartRequester.getHeadlessBrowser();
        let browserPage = await browser.newPage();

        return [browser, browserPage];
    }
}
