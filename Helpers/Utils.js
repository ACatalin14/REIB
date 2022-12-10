import fs from 'fs';
import delay from 'delay';
import { RESTING_DELAY_MAX, RESTING_DELAY_MIN } from '../Constants.js';

export function getRandomItem(items) {
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
}

export function getRandomRestingDelay() {
    return RESTING_DELAY_MIN + Math.random() * (RESTING_DELAY_MAX - RESTING_DELAY_MIN);
}

export function useProxies() {
    return getBooleanValueFromEnvVariable(process.env.USE_PROXIES);
}

export function useHeadlessBrowser() {
    return getBooleanValueFromEnvVariable(process.env.USE_HEADLESS_BROWSER);
}

export function useTestDb() {
    return getBooleanValueFromEnvVariable(process.env.USE_TEST_DB);
}

function getBooleanValueFromEnvVariable(envVariable) {
    if (!envVariable) {
        return false;
    }

    return ['yes', 'true', '1'].includes(envVariable.toLowerCase());
}

export function consoleLog(...logs) {
    const timeFormatting = {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    const currentDate = new Date();
    const timestamp = '[' + currentDate.toLocaleTimeString('ro-RO', timeFormatting) + '] ';
    const content = timestamp + [...logs].join(' ');

    console.log(content);
    fs.appendFile('./reib.log', content + '\n', () => {});
}

export function mapObjectsToValueOfKey(objects, key) {
    const values = new Array(objects.length);

    for (let i = 0; i < objects.length; i++) {
        values[i] = objects[i][key];
    }

    return values;
}

export function indexObjectsByKey(objects, key) {
    const map = {};

    for (let i = 0; i < objects.length; i++) {
        map[objects[i][key]] = objects[i];
    }

    return map;
}

export async function callUntilSuccess(method, args, errorMessage, retryTimeMs, attemptsCount = null) {
    try {
        return await method(...args);
    } catch (error) {
        consoleLog(error);

        attemptsCount = attemptsCount === null ? null : attemptsCount - 1;

        if (attemptsCount === 0) {
            consoleLog(`${errorMessage}`);
            throw error;
        }

        const retryMessage = `Retrying in ${retryTimeMs / 1000} seconds...`;
        const message =
            attemptsCount === null
                ? `${errorMessage} ${retryMessage}`
                : `${errorMessage} Attempting for ${attemptsCount} more times. ${retryMessage}`;

        consoleLog(message);
        await delay(retryTimeMs);
        return await callUntilSuccess(method, args, errorMessage, retryTimeMs, attemptsCount);
    }
}
