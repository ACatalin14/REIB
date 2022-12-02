import { consoleLog } from '../Helpers/Utils.js';
import { load } from 'cheerio';

export class IndexBuilder {
    constructor(source, dbCollection, dataExtractor, smartRequester, imageHasher) {
        this.source = source;
        this.dbMarketListings = dbCollection;
        this.dataExtractor = dataExtractor;
        this.smartRequester = smartRequester;
        this.imageHasher = imageHasher;
    }

    getListingIdFromUrl(url) {
        // To be implemented
    }

    async fetchListingsFromXml(xmlUrl) {
        let response;

        try {
            consoleLog(`[${this.source}] Fetching XML from: ${xmlUrl}`, 123, 'abc');
            response = await this.smartRequester.get(xmlUrl);
        } catch (error) {
            consoleLog(`[${this.source}] Error while fetching XML from: ${xmlUrl}.`);
            consoleLog(error);
            return;
        }

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

    async fetchListingDataFromPage(listingShortData, browserPage) {
        const listingData = await this.fetchListingDetailsAndImageUrls(listingShortData, browserPage);

        listingData.images = await this.imageHasher.fetchBinHashesFromUrls(listingData.imageUrls);

        delete listingData.imageUrls;

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
            // TODO: Maybe check: browserPage !== null ? htmlResponse = getPageFromUrl() : apiResponse = get();
            htmlResponse = await this.smartRequester.getPageFromUrl(browserPage, listingShortData.url);
            return htmlResponse;
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch listing HTML from: ${listingShortData.url}.`);
            throw error;
        }
    }

    getListingDetailsWithExtractor(listingShortData) {
        if (!this.dataExtractor.hasListingDetails()) {
            throw new Error(`[${this.source}] Cannot find all listing details at: ${listingShortData.url}.`);
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
            consoleLog(`[${this.source}] Cannot extract image URL's from listing: ${listingShortData.url}.`);
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
