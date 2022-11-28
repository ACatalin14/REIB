export function consoleLog(...logs) {
    const timeFormatting = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const currentDate = new Date();

    console.log('[' + currentDate.toLocaleTimeString('en-US', timeFormatting) + ']', ...logs);
}

export function mapObjectsToValueOfKey(objects, key) {
    const values = new Array(objects.length);

    for (let i = 0; i < objects.length; i++) {
        values[i] = objects[i][key];
    }

    return values;
}
