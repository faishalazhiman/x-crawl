#!/usr/bin/env node

import * as fs from "fs";
import * as Papa from "papaparse";
import { program } from "commander";
import { pick } from "lodash";

interface InputRow {
  username: string;
  in_reply_to_screen_name: string;
}

interface OutputRow {
  source: string;
  target: string;
}

/**
 * Baca CSV hasil crawling dan ambil hanya kolom:
 * - username
 * - in_reply_to_screen_name
 *
 * Sekaligus filter:
 * - HANYA baris yang punya username DAN in_reply_to_screen_name
 *   (supaya edge-list buat SNA/Gephi bersih)
 */
function readCSV(filePath: string): Promise<InputRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, "utf8");

    Papa.parse(fileContent, {
      header: true,
      complete: (result) => {
        const data = (
          result.data.map((d) =>
            // ambil hanya 2 kolom yang kita butuhkan
            pick(d, ["username", "in_reply_to_screen_name"])
          ) as InputRow[]
        )
          // FILTER: wajib ada username dan in_reply_to_screen_name
          .filter(
            (d) =>
              typeof d.username === "string" &&
              d.username.trim() !== "" &&
              typeof d.in_reply_to_screen_name === "string" &&
              d.in_reply_to_screen_name.trim() !== ""
          );

        resolve(data);
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Tulis CSV baru dengan format:
 * source,target
 * userA,userB
 * userC,userD
 */
function writeCSV(filePath: string, data: OutputRow[]): void {
  const csv = Papa.unparse(data, {
    columns: ["source", "target"],
    delimiter: ",",
    header: true,
    quotes: true,
  });

  fs.writeFileSync(filePath, csv, "utf8");
  console.log(`CSV file was written successfully to ${filePath}`);
}

/**
 * Transform dari CSV hasil crawling → edge list untuk Gephi/SNA
 */
async function transformCSV(inputFilePath: string, outputFilePath: string) {
  try {
    const inputData = await readCSV(inputFilePath);

    // Di titik ini, inputData hanya berisi baris yang lengkap (source & target)
    const outputData: OutputRow[] = inputData.map((row) => ({
      source: row.username,
      target: row.in_reply_to_screen_name,
    }));

    writeCSV(outputFilePath, outputData);
  } catch (error) {
    console.error("Error processing CSV file:", error);
  }
}

// CLI options
program
  .requiredOption("-i, --input <path>", "Input CSV file path")
  .requiredOption("-o, --output <path>", "Output CSV file path");

program.parse(process.argv);

const options = program.opts();
transformCSV(options.input, options.output);
