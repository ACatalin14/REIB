import { DataExtractor } from './DataExtractor.js';
import { load } from 'cheerio';
import { LISTING_PRICE_MIN_THRESHOLD } from '../Constants.js';
import { consoleLog } from '../Helpers/Utils.js';

export class DataExtractorImobiliareRo extends DataExtractor {
    setDataSource(html) {
        const $ = load(html);
        let dataLayerPosition = -1;

        const dataLayerScript = $('head > script')
            .filter(function () {
                const position = $(this).text().indexOf('dataLayer = [');
                dataLayerPosition = position !== -1 ? position : dataLayerPosition;
                return position !== -1;
            })
            .get()[0];

        const urlMeta = $('head > meta[name="cXenseParse:url"]');

        // Get text from "dataLayer = [" until the end of the script, if found
        this.dataLayerText = dataLayerPosition !== -1 ? $(dataLayerScript).text().substring(dataLayerPosition) : '';
        this.url = urlMeta.attr('content');
        this.html = html;
    }

    hasListingDetails() {
        // Check if retrieved page does contain listing details. If not found, it is not
        // a valid listing page (search page with multiple results, 404 not found page, etc.)
        return (
            this.hasPriceDetails() &&
            this.dataLayerText.indexOf('propertySurface') !== -1 &&
            this.hasRoomsCountDetails() &&
            !this.hasExpiredMessageBox()
        );
    }

    hasPriceDetails() {
        if (this.dataLayerText.indexOf('propertyPrice') === -1) {
            return false;
        }

        const price = this.extractPrice();

        return price >= LISTING_PRICE_MIN_THRESHOLD;
    }

    hasRoomsCountDetails() {
        if (this.dataLayerText.indexOf('propertyNumberOfRooms') !== -1) {
            return true;
        }

        const roomsCountFromTitle = this.extractRoomsCountFromTitle();

        if (roomsCountFromTitle) {
            return true;
        }

        switch (true) {
            case this.url.indexOf('garsoniera') >= 0:
            case this.url.indexOf('studio') >= 0:
            case this.url.indexOf('1-camera') >= 0:
                return true;

            default:
                const numberMatches = this.url.match(/([0-9]+)-camere/);
                return numberMatches && !isNaN(Number(numberMatches[1]));
        }
    }

    hasExpiredMessageBox() {
        const $ = load(this.html);
        const expiredTags = $('div.tag_expirat');

        return expiredTags.length > 0;
    }

    extractPrice() {
        const priceStartPos = this.dataLayerText.indexOf('propertyPrice') + 13 + 3;
        const priceLength = this.dataLayerText.substring(priceStartPos).indexOf(',');
        const priceText = this.dataLayerText.substring(priceStartPos, priceStartPos + priceLength);

        return Number(priceText);
    }

    extractRoomsCount() {
        if (this.dataLayerText.indexOf('propertyNumberOfRooms') !== -1) {
            const roomsStartPos = this.dataLayerText.indexOf('propertyNumberOfRooms') + 21 + 4;
            const roomsLength = this.dataLayerText.substring(roomsStartPos).indexOf("'");
            const roomsText = this.dataLayerText.substring(roomsStartPos, roomsStartPos + roomsLength);

            return Number(roomsText);
        }

        const roomsCountFromTitle = this.extractRoomsCountFromTitle();

        if (roomsCountFromTitle) {
            return roomsCountFromTitle;
        }

        switch (true) {
            case this.url.indexOf('garsoniera') >= 0:
            case this.url.indexOf('studio') >= 0:
            case this.url.indexOf('1-camera') >= 0:
                return 1;

            default:
                const numberMatches = this.url.match(/([0-9]+)-camere/);
                return Number(numberMatches[1]);
        }
    }

    extractRoomsCountFromTitle() {
        const $ = load(this.html);
        const title = $('#content-wrapper div.titlu_top h1').get()[0];
        const titleText = $(title).text().toLowerCase();

        if (
            titleText.indexOf('garsoniera') >= 0 ||
            titleText.indexOf('studio') >= 0 ||
            titleText.indexOf('o camera') >= 0 ||
            titleText.indexOf('1 camera') >= 0
        ) {
            return 1;
        }

        const titleMatches = titleText.match(/([0-9]+) camere/);

        if (titleMatches) {
            return Number(titleMatches[1]);
        }

        return null;
    }

    extractSurface() {
        const surfaceStartPos = this.dataLayerText.indexOf('propertySurface') + 15 + 4;
        const surfaceLength = this.dataLayerText.substring(surfaceStartPos).indexOf("'");
        let surfaceText = this.dataLayerText.substring(surfaceStartPos, surfaceStartPos + surfaceLength);
        surfaceText = surfaceText.replace(',', '.');

        return Number(surfaceText);
    }

    extractConstructionYear() {
        const yearStartPos = this.dataLayerText.indexOf('propertyConstructionYear') + 24 + 4;
        const yearLength = this.dataLayerText.substring(yearStartPos).indexOf("'");

        return this.dataLayerText.substring(yearStartPos, yearStartPos + yearLength);
    }

    async extractImageUrls(browserPage) {
        if (this.hasNoImagesOfficially()) {
            return [];
        }

        await browserPage.click(
            '#galerie_detalii > div.swiper.main_slider > div.swiper-wrapper > div > a > img.front_image'
        );

        let imageUrls = await this.extractImageUrlsFromIframe('#modal-galerie', browserPage);

        if (!imageUrls.length) {
            imageUrls = await this.extractImageUrlsFromIframe('#modal-galerie_schite', browserPage);
        }

        if (!imageUrls.length) {
            throw new Error('Cannot extract any image url from listing.');
        }

        return imageUrls;
    }

    async extractImageUrlsFromIframe(iframeId, browserPage) {
        try {
            consoleLog(`[${this.source}] Extracting image urls from iframe ${iframeId}...`);

            const iframeElementHandle = await browserPage.waitForSelector(iframeId, { timeout: 5000 });
            const frame = await iframeElementHandle.contentFrame();
            await frame.waitForSelector('#slider_imagini > div.swipe-wrap > div', { timeout: 5000 });
            const html = await frame.content();

            const $ = load(html);
            let imageUrls = [];

            consoleLog(`[${this.source}] Traversing divs with links...`);

            $('#slider_imagini > div.swipe-wrap > div').each((index, div) => {
                const img = $('a > img', div);
                const src = img.attr('src');
                const dataSrc = img.attr('data-src');
                const dataOriginal = img.attr('data-original');

                if (dataOriginal && dataOriginal.indexOf('http') === 0) {
                    imageUrls.push(dataOriginal);
                    return;
                }

                if (dataSrc && dataSrc.indexOf('http') === 0) {
                    imageUrls.push(dataSrc);
                    return;
                }

                if (src && src.indexOf('http') === 0) {
                    imageUrls.push(src);
                }
            });

            // Delete the last image since it is the same with the first image
            imageUrls.splice(imageUrls.length - 1, 1);

            consoleLog(`[${this.source}] Found ${imageUrls.length} images to fetch.`);

            return imageUrls;
        } catch (error) {
            return [];
        }
    }

    hasNoImagesOfficially() {
        const $ = load(this.html);
        const panelsWithNoImageText = $('div.noimage_wp');

        return panelsWithNoImageText.length > 0;
    }
}
