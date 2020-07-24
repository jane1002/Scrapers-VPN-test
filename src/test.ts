import {
    downloadFiles,
    openFolder,
    writeJSONFileToFolder
} from './helper';
import * as fs from 'fs';

// const list:Array<string> = readRecordsFromCSVFile('relevant-dockets-test.csv', 'TX');
// console.log(list.length);


// const links = ['https://docs.cpuc.ca.gov/PublishedDocs/Efile/G000/M330/K052/330052739.PDF','https://docs.cpuc.ca.gov/PublishedDocs/Efile/G000/M330/K052/330052739.PDF', 'https://docs.cpuc.ca.gov/PublishedDocs/Published/G000/M344/K033/344033659.PDF'];

// downloadFilesSync(links, './');


import csv from 'csv-parser';
import { Filing } from './models/Filing';


const filePathCA = 'CA-filings.csv';
const headerCA: Array<string> = ['docketID', 'filingID','filingDate', 'documentType', 'filedBy','filingDescription', 'downloadLinks'];

const filePathTX = 'TX-filings.csv';
const headerTX: Array<string> = ['docketID', 'filingID', 'fileStamp', 'party','filingDescription', 'downloadLinks'];

/**
 * Read record from csv file, and save one record to json and also download files(output folder: output)
 * @param filePath: file location
 * @param header: column name
 */
const exportUtility = (filePath: string, header: Array<string>): void => {
    const table = [];
    fs.createReadStream(filePath)
        .pipe(csv({ headers: header }))
        .on('data', async function(filing) {
            try {
                const row: Filing = filing;
                // console.log(row);
                console.log('docketID is: ' + filing.docketID);
                console.log('filingID is: ' + filing.filingID);
                const downloadLinks: Array<string> = convertLinksToArray(filing.downloadLinks);
                row.downloadLinks = downloadLinks;

                // export
                const pt = openFolder(`${filing.docketID}/${filing.filingID}`);
                writeJSONFileToFolder(filing, pt, `${filing.filingID}.json`);
                await downloadFiles(filing.downloadLinks, pt);

                table.push(row);
            }
            catch(err) {
                // error handler
                console.log(err.message);
            }
        })
        .on('end',function() {
            // some final operation
            // console.log(table);
            // export
            // saveDatatoFiles(table);
            console.log('Finish');
        });

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


exportUtility(filePathTX, headerTX);
