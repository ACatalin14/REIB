import { DataExtractor } from './DataExtractor.js';
import { load } from 'cheerio';
import {
    LISTING_PRICE_MAX_SUS_THRESHOLD,
    LISTING_PRICE_MIN_THRESHOLD,
    LISTING_ROOMS_COUNT_SUS_THRESHOLD,
    RETRY_IMAGES_URLS_GET_DELAY,
} from '../Constants.js';
import { callUntilSuccess, consoleLog } from '../Helpers/Utils.js';

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

    hasValidListingDetails() {
        // Check if retrieved page does contain listing details. If not found, it is not
        // a valid listing page (search page with multiple results, 404 not found page, etc.)
        if (
            !this.hasBasePriceDetails() ||
            !this.hasSurfaceDetails() ||
            !this.hasRoomsCountDetails() ||
            this.hasExpiredMessageBox()
        ) {
            return false;
        }

        const price = this.extractBasePrice();
        const roomsCount = this.extractRoomsCount();

        if (price < LISTING_PRICE_MIN_THRESHOLD) {
            return false;
        }

        return price <= LISTING_PRICE_MAX_SUS_THRESHOLD || roomsCount >= LISTING_ROOMS_COUNT_SUS_THRESHOLD;
    }

    hasBasePriceDetails() {
        if (this.dataLayerText.indexOf('propertyPrice') === -1) {
            return false;
        }

        const price = this.extractBasePrice();

        return price >= LISTING_PRICE_MIN_THRESHOLD;
    }

    hasSurfaceDetails() {
        if (this.dataLayerText.indexOf('propertySurface') === -1) {
            return false;
        }

        const surface = this.extractSurface();

        return !!surface;
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

    extractBasePrice() {
        const priceStartPos = this.dataLayerText.indexOf('propertyPrice') + 13 + 3;
        const priceLength = this.dataLayerText.substring(priceStartPos).indexOf(',');
        const priceText = this.dataLayerText.substring(priceStartPos, priceStartPos + priceLength);

        return Number(priceText);
    }

    extractHasSeparateTVA() {
        const $ = load(this.html);

        const containsPlusTVAString = function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .match(/(\+tva|\+ tva|plus tva)/);
            return matches !== null;
        };

        const containsIncludedTVAString = function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .match(/(tva inclus|inclus tva)/);
            return matches !== null;
        };

        const titleSelector = $('h1[data-monitive-marker-detalii]');

        const tvaFromPrice = $('.pret > .tva').filter(containsPlusTVAString);
        const tvaFromTitle = titleSelector.filter(containsPlusTVAString);

        const includedTvaFromTitle = titleSelector.filter(containsIncludedTVAString);
        const includedTvaFromDescription = $('#b_detalii_text .collapsible_content').filter(containsIncludedTVAString);

        return includedTvaFromTitle.length > 0 || includedTvaFromDescription.length > 0
            ? false
            : tvaFromPrice.length > 0 || tvaFromTitle.length > 0;
    }

    extractHasMentionedTVA() {
        const $ = load(this.html);

        const containsTVAString = function () {
            const position = $(this).text().toLowerCase().indexOf('tva');
            return position !== -1;
        };

        const tvaFromPrice = $('.pret > .tva').filter(containsTVAString);
        const tvaFromTitle = $('h1[data-monitive-marker-detalii]').filter(containsTVAString);
        const tvaFromDescription = $('#b_detalii_text .collapsible_content').filter(containsTVAString);

        return tvaFromPrice.length > 0 || tvaFromTitle.length > 0 || tvaFromDescription.length > 0;
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

    extractZone() {
        const areaStartPos = this.dataLayerText.indexOf('propertyArea') + 12 + 4;
        const areaLength = this.dataLayerText.substring(areaStartPos).indexOf("'");
        const area = this.dataLayerText.substring(areaStartPos, areaStartPos + areaLength);

        if (area !== '') {
            return area;
        }

        const villageStartPos = this.dataLayerText.indexOf('sRegionVillage') + 14 + 4;
        const villageLength = this.dataLayerText.substring(villageStartPos).indexOf("'");
        const village = this.dataLayerText.substring(villageStartPos, villageStartPos + villageLength);

        if (village !== '') {
            return village;
        }

        const cityStartPos = this.dataLayerText.indexOf('sRegionCity') + 11 + 4;
        const cityLength = this.dataLayerText.substring(cityStartPos).indexOf("'");
        const city = this.dataLayerText.substring(cityStartPos, cityStartPos + cityLength);

        return city !== '' ? city : null;
    }

    extractConstructionYear() {
        const yearStartPos = this.dataLayerText.indexOf('propertyConstructionYear') + 24 + 4;
        const yearLength = this.dataLayerText.substring(yearStartPos).indexOf("'");
        const year = this.dataLayerText.substring(yearStartPos, yearStartPos + yearLength);

        return year === '0' || year === '' ? null : year;
    }

    extractFloor() {
        const $ = load(this.html);
        const floorElements = $('#b_detalii_caracteristici ul > li').filter(function () {
            return $(this).text().toLowerCase().indexOf('etaj') !== -1;
        });

        if (floorElements.length === 0) {
            return null;
        }

        const floorText = $('span', floorElements[0]).text();

        return floorText.replace(/[\s]*\/.+$/, '').replace(/(etaj[\s]*)/i, '');
    }

    extractHasCentralHeating() {
        const $ = load(this.html);

        const containsCentralHeating = function () {
            const matches = $(this)
                .text()
                .match(/centrala( proprie| termica)/i);
            return matches !== null;
        };

        const centralHeatingFromUtilities = $('ul.utilitati > li > span').filter(containsCentralHeating);
        const centralHeatingFromDescription = $('#b_detalii_text .collapsible_content').filter(containsCentralHeating);

        return centralHeatingFromUtilities.length > 0 || centralHeatingFromDescription.length > 0;
    }

    async extractImageUrls(browserPage) {
        if (this.hasNoImagesOfficially()) {
            return [];
        }

        await browserPage.click(
            '#galerie_detalii > div.swiper.main_slider > div.swiper-wrapper > div > a > img.front_image'
        );

        return await callUntilSuccess(
            this.extractImageUrlsFromIframes.bind(this),
            [browserPage],
            `[${this.source}] Cannot extract image URL's from iframes.`,
            RETRY_IMAGES_URLS_GET_DELAY,
            3
        );
    }

    async extractImageUrlsFromIframes(browserPage) {
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
