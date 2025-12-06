#!/usr/bin/env node

import * as fs from "fs";
import * as Papa from "papaparse";
import { program } from "commander";
import { pick } from "lodash";

interface InputRow {
  username: string;
  in_reply_to_screen_name?: string;
  full_text?: string;
}

interface OutputRow {
  source: string;
  target: string;
}

/**
 * Baca CSV hasil crawling, ambil kolom:
 * - username
 * - in_reply_to_screen_name
 * - full_text
 */
function readCSV(filePath: string): Promise<InputRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, "utf8");

    Papa.parse(fileContent, {
      header: true,
      complete: (result) => {
        const data = (
          result.data.map((d) =>
            pick(d, ["username", "in_reply_to_screen_name", "full_text"])
          ) as InputRow[]
        ).filter(
          (d) =>
            typeof d.username === "string" &&
            d.username.trim() !== ""
        ); // minimal harus punya username / sumber

        resolve(data);
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Tulis CSV baru: edge list untuk Gephi
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
 * Ambil semua mention @username dari teks
 */
function extractMentions(text: string | undefined): string[] {
  if (!text) return [];

  const mentionRegex = /@([A-Za-z0-9_]{1,15})/g; // format handle Twitter
  const mentions = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const handle = match[1].trim();
    if (handle) {
      mentions.add(handle);
    }
  }

  return Array.from(mentions);
}

/**
 * Transform:
 *   - source  = username
 *   - target  = reply_to (kalau ada) + semua @mention di full_text
 */
async function transformCSV(inputFilePath: string, outputFilePath: string) {
  try {
    const inputData = await readCSV(inputFilePath);
    const outputData: OutputRow[] = [];

    for (const row of inputData) {
      const source = row.username.trim();
      const targets = new Set<string>();

      // 1) edge reply jika ada
      if (
        typeof row.in_reply_to_screen_name === "string" &&
        row.in_reply_to_screen_name.trim() !== ""
      ) {
        targets.add(row.in_reply_to_screen_name.trim());
      }

      // 2) edge mention dari full_text
      const mentions = extractMentions(row.full_text);
      for (const m of mentions) {
        // optional: jangan bikin self-loop
        if (m !== source) {
          targets.add(m);
        }
      }

      // kalau nggak ada target sama sekali, lewati baris ini
      if (targets.size === 0) continue;

      // masukkan semua edge (source → setiap target unik)
      for (const target of targets) {
        outputData.push({ source, target });
      }
    }

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
