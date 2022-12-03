import fs from 'fs';

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

export async function tryConnectToDatabase(dbClient, logSource = 'reib') {
    try {
        consoleLog(`[${logSource}] Connecting to the database...`);
        await dbClient.connect();
        return true;
    } catch (error) {
        consoleLog(`[${logSource}] Cannot connect to Mongo DB.`);
        consoleLog(error);
        return false;
    }
}

export async function tryDisconnectFromDatabase(dbClient, logSource = 'reib') {
    try {
        consoleLog(`[${logSource}] Disconnecting from the database...`);
        await dbClient.disconnect();
        return true;
    } catch (error) {
        consoleLog(`[${logSource}] Cannot disconnect from Mongo DB.`);
        consoleLog(error);
        return false;
    }
}