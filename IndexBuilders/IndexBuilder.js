import { consoleLog } from '../Helpers/Utils.js';
import { load } from 'cheerio';
import delay from 'delay';
import { RETRY_IMAGES_FETCH_DELAY } from '../Constants.js';

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
            consoleLog(`[${this.source}] Fetching XML from: ${xmlUrl}`);
            response = await this.smartRequester.get(xmlUrl);
        } catch (error) {
            // TODO: Retry everywhere by waiting 1 second and doing again the request / mongo query / etc.
            consoleLog(`[${this.source}] Error while fetching XML from: ${xmlUrl}.`);
            throw error;
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

    async fetchListingDataFromPage(listingShortData) {
        const listingData = await this.fetchListingDetailsAndImageUrls(listingShortData);

        try {
            listingData.images = await this.fetchBinHashesFromUrls(listingData.imageUrls);
        } catch (error) {
            consoleLog(
                `[${this.source}] Cannot fetch all images due to possible bot detection. Retrying in ${
                    RETRY_IMAGES_FETCH_DELAY / 1000
                } seconds...`
            );
            await delay(RETRY_IMAGES_FETCH_DELAY);
            listingData.images = await this.fetchBinHashesFromUrls(listingData.imageUrls);
        }

        delete listingData.imageUrls;

        return listingData;
    }

    async fetchListingDetailsAndImageUrls(listingShortData) {
        let [browser, browserPage] = await this.getNewBrowserAndNewPage();

        try {
            consoleLog(`[${this.source}] Fetching listing page...`);
            const listingPageHtml = await this.fetchListingPage(listingShortData, browserPage);

            this.dataExtractor.setDataSource(listingPageHtml);

            const listingDetails = this.getListingDetailsWithExtractor(listingShortData);

            consoleLog(`[${this.source}] Fetching listing image urls...`);
            const imageUrls = await this.fetchListingImageUrls(listingShortData, browserPage);

            return {
                ...listingDetails,
                imageUrls: imageUrls,
            };
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch listing details and image urls.`);
            throw error;
        } finally {
            await this.closeBrowser(browser);
        }
    }

    async fetchBinHashesFromUrls(urls) {
        consoleLog(`[${this.source}] Fetching images from urls...`);
        const images = await this.smartRequester.fetchImagesFromUrls(urls);
        consoleLog(`[${this.source}] Hashing images...`);
        return this.imageHasher.hashImages(images);
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
        if (!this.dataExtractor.hasValidListingDetails()) {
            throw new Error('Cannot find all listing details.');
        }

        const price = this.dataExtractor.extractPrice();
        const surface = this.dataExtractor.extractSurface();
        const roomsCount = this.dataExtractor.extractRoomsCount();
        const constructionYear = this.dataExtractor.extractConstructionYear();

        return {
            id: listingShortData.id,
            lastModified: new Date(listingShortData.lastModified),
            roomsCount: roomsCount,
            price: price,
            surface: surface,
            pricePerSurface: Math.round((price / surface) * 100) / 100,
            constructionYear: constructionYear,
        };
    }

    async fetchListingImageUrls(listingShortData, browserPage) {
        try {
            return await this.dataExtractor.extractImageUrls(browserPage);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot extract image URL's from listing.`);
            throw error;
        }
    }

    async getNewBrowserAndNewPage() {
        try {
            let browser = await this.smartRequester.getHeadlessBrowser();
            let browserPage = await browser.newPage();

            return [browser, browserPage];
        } catch (error) {
            consoleLog(`[${this.source}] Cannot launch headless browser. Retrying in 1 second...`);
            await delay(1000);
            return await this.getNewBrowserAndNewPage();
        }
    }

    async closeBrowser(browser) {
        try {
            await browser.close();
        } catch (error) {
            consoleLog(`[${this.source}] Cannot close headless browser. Moving on...`);
            consoleLog(error);
        }
    }
}
