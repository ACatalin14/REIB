import { DataExtractor } from './DataExtractor.js';
import {
    LISTING_PRICE_MAX_SUS_THRESHOLD,
    LISTING_PRICE_MIN_THRESHOLD,
    LISTING_ROOMS_COUNT_SUS_THRESHOLD,
} from '../Constants.js';

export class DataExtractorOlxRo extends DataExtractor {
    setDataSource(data) {
        this.url = data.url;
        this.data = data;
    }

    hasValidListingDetails() {
        // Check if retrieved listing does contain enough details
        if (
            !this.hasBasePriceDetails() ||
            !this.hasSurfaceDetails() ||
            !this.hasRoomsCountDetails() ||
            this.hasExpired()
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
        const priceElements = this.data.params.filter((param) => param.key === 'price');

        if (priceElements.length === 0) {
            return false;
        }

        const price = this.extractBasePrice();

        return price >= LISTING_PRICE_MIN_THRESHOLD;
    }

    hasSurfaceDetails() {
        const surfaceElements = this.data.params.filter((param) => param.key === 'm');

        if (surfaceElements.length === 0) {
            return false;
        }

        const surface = this.extractSurface();

        return !!surface;
    }

    hasRoomsCountDetails() {
        if ([1163, 1165, 1167].includes(this.data.category.id)) {
            return true;
        }

        const roomsCountFromTitle = this.extractRoomsCountFromText(this.data.title.toLowerCase());
        const roomsCountFromDescription = this.extractRoomsCountFromText(this.data.description.toLowerCase());

        if (!!roomsCountFromTitle || !!roomsCountFromDescription) {
            return true;
        }

        switch (true) {
            case this.url.indexOf('garsoniera') >= 0:
            case this.url.indexOf('studio') >= 0:
            case this.url.indexOf('o-camera') >= 0:
            case this.url.indexOf('1-camera') >= 0:
                return true;

            default:
                const numberMatches = this.url.match(/([0-9]+)-camere/);
                return numberMatches && !isNaN(Number(numberMatches[1]));
        }
    }

    hasExpired() {
        return new Date() > new Date(this.data.valid_to_time);
    }

    extractBasePrice() {
        const price = this.data.params.filter((param) => param.key === 'price')[0].value;

        switch (price.currency) {
            case 'RON':
            case 'LEI':
                return price.converted_value
                    ? Math.round(price.converted_value * 100) / 100
                    : Math.round(price.value * 0.2 * 100) / 100;

            case 'USD':
                return price.converted_value
                    ? Math.round(price.converted_value * 100) / 100
                    : Math.round(price.value * 0.95 * 100) / 100;

            default:
                return price.value;
        }
    }

    extractHasSeparateTVA() {
        const titleMatches = this.data.title.toLowerCase().match(/(plus tva|\+ tva|\+tva)/);
        const descriptionMatches = this.data.description.toLowerCase().match(/(plus tva|\+ tva|\+tva)/);

        const titleIncludesTVA = this.data.description.toLowerCase().match(/(tva inclus|inclus tva)/);
        const descriptionIncludesTVA = this.data.description.toLowerCase().match(/(tva inclus|inclus tva)/);

        if (!!titleIncludesTVA || !!descriptionIncludesTVA) {
            return false;
        }

        return !!titleMatches || !!descriptionMatches;
    }

    extractHasMentionedTVA() {
        const titleMatches = this.data.title.toLowerCase().match(/tva/);
        const descriptionMatches = this.data.description.toLowerCase().match(/tva/);

        return !!titleMatches || !!descriptionMatches;
    }

    extractHasNewApartmentWordsInTitleAndDescription() {
        const titleMatches = this.data.title.toLowerCase().match(/(nou|dezvoltator)/);
        const descriptionMatches = this.data.description.toLowerCase().match(/(nou|dezvoltator)/);

        return !!titleMatches || !!descriptionMatches;
    }

    extractRoomsCount() {
        switch (this.data.category.id) {
            case 1163:
                return 1;
            case 1165:
                return 2;
            case 1167:
                return 3;
        }

        const roomsCountFromTitle = this.extractRoomsCountFromText(this.data.title.toLowerCase());

        if (roomsCountFromTitle) {
            return roomsCountFromTitle;
        }

        const roomsCountFromDescription = this.extractRoomsCountFromText(this.data.description.toLowerCase());

        if (roomsCountFromDescription) {
            return roomsCountFromDescription;
        }

        switch (true) {
            case this.url.indexOf('garsoniera') >= 0:
            case this.url.indexOf('studio') >= 0:
            case this.url.indexOf('o-camera') >= 0:
            case this.url.indexOf('1-camera') >= 0:
                return 1;

            default:
                const numberMatches = this.url.match(/([0-9]+)-camere/);
                return Number(numberMatches[1]);
        }
    }

    extractRoomsCountFromText(text) {
        if (
            text.indexOf('garsoniera') >= 0 ||
            text.indexOf('studio') >= 0 ||
            text.indexOf('o camera') >= 0 ||
            text.indexOf('1 camera') >= 0
        ) {
            return 1;
        }

        const textMatches = text.match(/([0-9]+) camere/);

        if (textMatches) {
            return Number(textMatches[1]);
        }

        return null;
    }

    extractSurface() {
        const surface = this.data.params.filter((param) => param.key === 'm')[0].value;

        return Number(surface.key);
    }

    extractZone() {
        if (this.data.location.district) {
            return this.data.location.district.name;
        }

        if (this.data.location.city) {
            return this.data.location.city.name;
        }

        if (this.data.location.region) {
            return this.data.location.region.name;
        }

        return null;
    }

    extractConstructionYear() {
        const yearElements = this.data.params.filter((param) => param.key === 'constructie');

        if (yearElements.length === 0) {
            return null;
        }

        return yearElements[0].value.label;
    }

    extractFloor() {
        const floorElements = this.data.params.filter((param) => param.key === 'floor');

        if (floorElements.length === 0) {
            return null;
        }

        return floorElements[0].value.label;
    }

    extractHasCentralHeating() {
        const titleMatches = this.data.title.toLowerCase().match(/centrala( proprie| termica)/);
        const descriptionMatches = this.data.description.toLowerCase().match(/centrala( proprie| termica)/);

        return !!titleMatches || !!descriptionMatches;
    }

    extractImageUrls() {
        return this.data.photos.map((photo) => {
            return photo.link.replace('{width}', photo.width).replace('{height}', photo.height);
        });
    }
}
