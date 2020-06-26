const json2csv = require('json2csv');
const os = require('os');
const fs = require('fs');
const request = require('request');
const path = require("path");

exports.exportJsonObjToCSV = (data,  outputFile) => {
    const header = false;
    const fields = Object.keys(data);
    const opts = {fields, header};

    try {
        const parser = new json2csv.Parser(opts);
        const csv = parser.parse(data);

        fs.writeFileSync(outputFile, `${csv}${os.EOL}`, {flag: 'a'});

    } catch (err) {
        console.error(err.message);
    }
};

exports.formatDocketNum = (docketNum) => {
    if(docketNum) {
        const pattern = /[0-9]+/;
        return pattern.exec(docketNum)[0];
    } else
        return docketNum;
};

exports.openFolder = (folderName) => {

    // todo: root folder path of output result can be set through config file
    const dir = path.resolve(__dirname, '../output');
    checkAndCreateFolder(dir);
    // console.log(dir);
    const dirPath = path.join(dir, folderName);

    checkAndCreateFolder(dirPath);

    // return folder path
    return dirPath;

};

exports.writeJSONFileToFolder= (obj, folderPath, fileName) => {
    const data = JSON.stringify(obj,null,"\t");
    const pt = path.join(folderPath, fileName);

    fs.writeFile(pt,data,function(err){
        if (err) {
            console.log('ERROR', err.code);
        }
    })
};

const checkAndCreateFolder = (dirPath) => {

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        // fs.stat(dirPath, function(err, stats) {
        //     if (err) {
        //         return console.error(err);
        //     }
        //     // console.log(stats);
        //     console.log("CREATE SUCCEED");
        //
        //     // 检测文件类型
        //     console.log("(isFile) ? " + stats.isFile());
        //     console.log("(isDirectory) ? " + stats.isDirectory());
        // });
        console.log("Folder is created");
    } else {
        console.log("Folder is already existed");
    }

};
