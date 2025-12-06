#!/usr/bin/env node
"use strict"; function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }
// src/scripts/convert-source-target.ts
var _fs = require('fs'); var fs = _interopRequireWildcard(_fs);
var _papaparse = require('papaparse'); var Papa = _interopRequireWildcard(_papaparse);
var _commander = require('commander');
var _lodash = require('lodash');
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    Papa.parse(fileContent, {
      header: true,
      complete: (result) => {
        const data = result.data.map((d) => _lodash.pick.call(void 0, d, ["username", "in_reply_to_screen_name"])).filter(
          (d) => d.username || d.in_reply_to_screen_name
        );
        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
}
function writeCSV(filePath, data) {
  const csv = Papa.unparse(data, {
    columns: ["source", "target"],
    delimiter: ",",
    header: true,
    quotes: true
  });
  fs.writeFileSync(filePath, csv, "utf8");
  console.log(`CSV file was written successfully to ${filePath}`);
}
async function transformCSV(inputFilePath, outputFilePath) {
  try {
    const inputData = await readCSV(inputFilePath);
    const outputData = inputData.map((row) => ({
      source: row.username,
      target: row.in_reply_to_screen_name || ""
    }));
    writeCSV(outputFilePath, outputData);
  } catch (error) {
    console.error("Error processing CSV file:", error);
  }
}
_commander.program.requiredOption("-i, --input <path>", "Input CSV file path").requiredOption("-o, --output <path>", "Output CSV file path");
_commander.program.parse(process.argv);
var options = _commander.program.opts();
transformCSV(options.input, options.output);
