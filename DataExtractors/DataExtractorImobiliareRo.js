import { DataExtractor } from './DataExtractor.js';
import { load } from 'cheerio';
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
            this.dataLayerText.indexOf('propertyPrice') !== -1 &&
            this.dataLayerText.indexOf('propertySurface') !== -1 &&
            this.hasRoomsCountDetails() &&
            !this.hasExpiredMessageBox()
        );
    }

    hasRoomsCountDetails() {
        if (this.dataLayerText.indexOf('propertyNumberOfRooms') !== -1) {
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

        switch (true) {
            case this.url.indexOf('garsoniera') >= 0:
            case this.url.indexOf('studio') >= 0:
            case this.url.indexOf('1-camera') >= 0:
                return Number(1);

            default:
                const numberMatches = this.url.match(/([0-9]+)-camere/);
                return Number(numberMatches[1]);
        }
    }

    extractSurface() {
        const surfaceStartPos = this.dataLayerText.indexOf('propertySurface') + 15 + 4;
        const surfaceLength = this.dataLayerText.substring(surfaceStartPos).indexOf("'");
        let surfaceText = this.dataLayerText.substring(surfaceStartPos, surfaceStartPos + surfaceLength);
        surfaceText = surfaceText.replace(',', '.');

        return Number(surfaceText);
    }

    async extractImageUrls(browserPage) {
        // TODO: remove
        consoleLog('Searching for image urls in listing...');

        if (this.hasNoImagesOfficially()) {
            return [];
        }

        await browserPage.click(
            '#galerie_detalii > div.swiper.main_slider > div.swiper-wrapper > div > a > img.front_image'
        );
        const iframeElementHandle = await browserPage.waitForSelector('#modal-galerie', { timeout: 120000 });
        const frame = await iframeElementHandle.contentFrame();
        await frame.waitForSelector('#slider_imagini > div.swipe-wrap > div', { timeout: 120000 });
        const html = await frame.content();

        const $ = load(html);
        let imageUrls = [];

        $('#slider_imagini > div.swipe-wrap > div').each((index, div) => {
            const img = $('a > img', div);
            const src = img.attr('src');
            const dataSrc = img.attr('data-src');
            const dataOriginal = img.attr('data-original');

            if (dataOriginal && dataOriginal.indexOf('http') === 0) {
                imageUrls.push(dataOriginal);
                return;
            }

            if (dataSrc && dataSrc.indexOf('http' === 0)) {
                imageUrls.push(dataSrc);
                return;
            }

            if (src && src.indexOf('http') === 0) {
                imageUrls.push(src);
            }
        });

        // Delete the last image since it is the same with the first image
        imageUrls.splice(imageUrls.length - 1, 1);

        // TODO: remove
        consoleLog(`Found ${imageUrls.length} image urls in listing.`);

        return imageUrls;
    }

    hasNoImagesOfficially() {
        const $ = load(this.html);
        const panelsWithNoImageText = $('div.noimage_wp');

        return panelsWithNoImageText.length > 0;
    }
}
