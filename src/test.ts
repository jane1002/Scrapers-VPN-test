import {
    downloadFiles,
    openFolder,
    writeJSONFileToFolder
} from './helper';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// const list:Array<string> = readRecordsFromCSVFile('relevant-dockets-test.csv', 'TX');
// console.log(list.length);


// const links = ['https://docs.cpuc.ca.gov/PublishedDocs/Efile/G000/M330/K052/330052739.PDF','https://docs.cpuc.ca.gov/PublishedDocs/Efile/G000/M330/K052/330052739.PDF', 'https://docs.cpuc.ca.gov/PublishedDocs/Published/G000/M344/K033/344033659.PDF'];

// downloadFilesSync(links, './');


import csv from 'csv-parser';
import { Filing } from './models/Filing';
import crypto from 'crypto';


const filePathCA = 'CA-filings-after.csv';
const headerCA: Array<string> = ['docketID', 'filingID','filingDate', 'documentType', 'filedBy','filingDescription', 'downloadLinks'];

// const filePathTX = 'TX-filings-after.csv';
const filePathTX = 'TX-filings-test.csv';
const headerTX: Array<string> = ['docketID', 'filingID', 'fileStamp', 'party','filingDescription', 'downloadLinks'];

const filePathFL = 'FL-filings-after.csv';
const headerFL: Array<string> = ['docketID', 'filingID', 'order', 'dateFiled','filingDescription', 'downloadLinks'];


/**
 * Read record from csv file, and save one record to json and also download files(output folder: output)
 * @param filePath: file location
 * @param header: column name
 */
const exportUtility = async (filePath: string, header: Array<string>): Promise<void> => {
    const table: Array<Filing> = [];

    fs.createReadStream(filePath)
        .pipe(csv({ headers: header }))
        .on('data', async function(filing) {
            try {
                const row: Filing = filing as Filing;
                // console.log('docketID is: ' + filing.docketID);
                // console.log('filingID is: ' + filing.filingID);
                const downloadLinks: Array<string> = convertLinksToArray(filing.downloadLinks);
                row.downloadLinks = downloadLinks;

                // export
                // const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
                // writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
                // await downloadFiles(filing.downloadLinks, pt);
                table.push(row);
            }
            catch(err) {
                // error handler
                console.log(err.message);
            }
        })
        .on('end',async function() {
            // some final operation
            // console.log(table);
            // export
            // saveDatatoFiles(table);

            // remove deplicate
            await removeDuplicatesFromCSV(table);
            console.log('Finish');
        });

};

/**
 * Generate a hash value based on one data object
 * @param data
 */
const generateHashVal = (data): string => {
    const hash = crypto.createHash('md5');
    return hash.update(JSON.stringify(data)).digest('base64');
};

const removeDuplicatesFromCSV = async (table: Array<Filing>): Promise<void> => {
    const noDupliateTable: Array<string> = new Array<string>();

    for(let idx = 0; idx < table.length; idx++) {
        const filing = table[idx];
        const hashVal = generateHashVal(filing);

        if(noDupliateTable.indexOf(hashVal) >= 0) {
            console.log('duplicate value',filing.docketID, filing.filingID, hashVal);
            // const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
            // writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
            // await downloadFiles(filing.downloadLinks, pt);
        } else {
            noDupliateTable.push(hashVal);
            // console.log('not duplicate value',filing.docketID, filing.filingID, hashVal);
        }
    }
};

const saveDatatoFiles = <T extends Filing>(filings: T[]): void  => {
    console.log(filings.length);
    filings.forEach(async filing => {
         const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
         writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
         await downloadFiles(filing.downloadLinks, pt);
    });
};

const convertLinksToArray = (downloadLinkStr: string):Array<string> => {
    // console.log(downloadLinkStr);
    downloadLinkStr = downloadLinkStr.substring(1, downloadLinkStr.length - 1);
    if(downloadLinkStr.length == 0) {
        return new Array<string>();
    } else {
        const links: Array<string> = downloadLinkStr.split(',').map(link => link.substring(1, link.length - 1));
        // console.log(links);
        return links;
    }
};

(():void => {
    let filePath;
    let header;

    try{
        const state = process.env.STATE ? process.env.STATE : new Error('No State is set');
        switch (state) {
            case 'FL':
                filePath = filePathFL;
                header = headerFL;
                break;
            case 'TX':
                filePath = filePathTX;
                header = headerTX;
                break;
            case 'CA':
                filePath = filePathCA;
                header = headerCA;
                break;
        }
        exportUtility(filePath, header).then(() => console.log('end'));

    } catch (err) {
        console.log(err.message);
    }
})();


