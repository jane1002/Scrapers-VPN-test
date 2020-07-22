import * as os from 'os';
import * as json2csv from 'json2csv';
import * as fs from 'fs';
import moment = require('moment');
import path from 'path';
import { exec, execSync } from 'child_process';

export const exportJsonObjToCSV = (data,  outputFile: string): void => {
    const header = false;
    const fields = Object.keys(data);
    const opts = { fields, header };

    try {
        const parser = new json2csv.Parser(opts);
        const csv = parser.parse(data);
        fs.writeFileSync(outputFile, `${csv}${os.EOL}`, { flag: 'a' });

    } catch (err) {
        console.error(err.message);
    }
};

export const formatDocketNum =  (docketNum: string): string => {
    if (docketNum) {
        const pattern = /[0-9]+/;
        return pattern.exec(docketNum)[0];
    }
    return docketNum;
};

export const getDateFromEnv = (datePattern: string, dateFromEnv: string): string => {
    const currentTime = dateFormatter(datePattern);
    const date = dateFromEnv ? dateFormatter(datePattern, dateFromEnv) :  currentTime;
    return date;
};

export const dateFormatter = (pattern: string, dateVal?: string): string => {
    if(!dateVal)
        return moment(Date.now()).format(pattern);
    else
        return moment(dateVal).format(pattern);
};


export const openFolder = (folderName: string): string => {

    // todo: root folder path of output result can be set through config file
    const dir = path.resolve(__dirname, `../../output`);
    checkAndCreateFolder(dir);

    const dirPath = path.join(dir, folderName);
    checkAndCreateFolder(dirPath);

    return dirPath;
};

export const writeJSONFileToFolder = (obj, folderPath, fileName): void => {
    const data = JSON.stringify(obj,null,'\t');
    const pt = path.join(folderPath, fileName);

    fs.writeFileSync(pt,data);
};

const checkAndCreateFolder = (dirPath): void => {

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

export const downloadSync = (url, filePath): void => {
    url = encodeURI(url);
    const wget = `wget -P ${filePath} "${url}"`;

    try {
        execSync(wget);
    } catch (err) {
        fs.writeFileSync('./error.txt',`${url}${os.EOL}`, { flag: 'a' });
        console.error(err.message);
    }
};

export const downloadFilesSync =  (urls, filePath): void => {

    for(const link of urls)
        downloadSync(link, filePath);
};

// Async
export const download = (url, filePath, resolve, reject): void => {
    url = encodeURI(url);
    const wget = `wget -P ${filePath} "${url}"`;

    exec(wget, (err) => {
        if (err) {
            console.log(`download fail: ${url}`, err.message);
            reject(err);
        } else {
            console.log(`download succ: ${url}`);
            resolve();
        }
    });
};

export const downloadFiles =  (urls, filePath): Promise<void> => {

    return Promise.all(urls.map(link => {
        // const pathName = url.parse(link).pathname;
        // const strArr = pathName.split('/');
        // const fileName = strArr[strArr.length - 1];
        // const savePath = path.join(filePath, fileName);

        return new Promise(function(resolve, reject) {

            download(link, filePath, resolve, reject);
        });
    }))
        .then(() => { console.log('all download succeed') }, (err) => {
            console.log('Download fail', err.message);
        });
};


export const saveDownloadLink = async (links): Promise<void> => {
    links.forEach((link) => {
        fs.writeFileSync('download_links.txt', `${link}${os.EOL}`, { flag: 'a' });
    });
};

/**
 *
 * @param file: file path
 * @param rowsFilter: TX, CA, FL
 */
export const readRecordsFromCSVFile = (file: string, rowsFilter: string): Array<string>  => {
    const data = fs.readFileSync(file);
    const list: Array<string> = ConvertToTable(data, rowsFilter);
    return list;
};

const ConvertToTable = (data, rowsFilter: string): Array<string> => {
    const fileData = data.toString();
    const table = [];

    const rows: Array<string> = fileData.split(`${os.EOL}`);
    for (let i = 1; i < rows.length; i++) { // not include header, so from index 1
        const curRow = rows[i];
        const fields: Array<string> = curRow.split(',');
        // console.log('field',fields[0], fields[1]);
        // table.push([fields[0], fields[1]]);
        if(fields[0] === rowsFilter)
            table.push(fields[1]);
    }
    return table;
};
