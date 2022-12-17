import { TVA_19, LISTING_OLD_APARTMENT_MAX_YEAR, TVA_5_MAX_PRICE, TVA_5_MAX_SURFACE, TVA_5 } from '../Constants.js';

export class DataExtractor {
    constructor() {
        this.source = 'data-extractor';
    }

    setDataSource(dataSource) {
        // To be implemented
    }

    hasValidListingDetails() {
        // To be implemented
    }

    extractBasePrice() {
        // To be implemented
    }

    extractHasSeparateTVA() {
        // To be implemented
    }

    extractHasMentionedTVA() {
        // To be implemented
    }

    extractRoomsCount() {
        // To be implemented
    }

    extractSurface() {
        // To be implemented
    }

    extractZone() {
        // To be implemented
    }

    extractConstructionYear() {
        // To be implemented
    }

    extractFloor() {
        // To be implemented
    }

    extractHasCentralHeating() {
        // To be implemented
    }

    extractImageUrls() {
        // To be implemented
    }

    extractHasNewApartment(hasMentionedTVA, constructionYear) {
        if (hasMentionedTVA) {
            // Any listing mentioning TVA usually presents a new apartment
            return true;
        }

        const years = constructionYear.match(/[0-9]{4}/g);

        if (!years) {
            // Any listing without mentioned TVA and no construction year usually presents an old apartment
            return false;
        }

        const year = Number(years[0]);

        // Any listing without mentioned TVA and a construction year after 2020 usually presents a new apartment
        return year > LISTING_OLD_APARTMENT_MAX_YEAR;
    }

    extractPrice(basePrice, surface, hasSeparateTVA) {
        if (!hasSeparateTVA) {
            return basePrice;
        }

        if (surface <= TVA_5_MAX_SURFACE && basePrice <= TVA_5_MAX_PRICE) {
            return basePrice * (1 + TVA_5);
        }

        return basePrice * (1 + TVA_19);
    }
}
