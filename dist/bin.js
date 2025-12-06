#!/usr/bin/env node
"use strict"; function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "x-crawl",
      version: "2.6.1",
      description: "Twitter/X advanced search crawler with auth token support",
      license: "MIT",
      author: "Helmi Satria modified by Ishal",
      repository: {
        type: "git",
        url: "https://github.com/faishalazhiman/x-crawl.git"
      },
      files: ["dist/"],
      bin: {
        "x-crawl": "./dist/bin.js",
        "x-crawl-convert": "./dist/scripts/convert-source-target.js"
      },
      scripts: {
        postinstall: "npx playwright install chromium",
        start: "ts-node src/crawl.ts",
        dev: "npx tsx src/dev.ts",
        build: "tsup",
        "convert-source-target": "ts-node src/scripts/convert-source-target.ts"
      },
      dependencies: {
        "@playwright/test": "^1.41.1",
        "@types/minimist": "^1.2.5",
        chalk: "^4.1.2",
        commander: "^11.1.0",
        dayjs: "^1.11.10",
        dotenv: "^16.4.1",
        lodash: "^4.17.21",
        minimist: "^1.2.8",
        papaparse: "^5.4.1",
        "playwright-extra": "^4.3.6",
        prompts: "^2.4.2",
        "puppeteer-extra-plugin-stealth": "^2.11.2",
        yargs: "^17.7.2",
        znv: "^0.3.2",
        zod: "^3.22.4"
      },
      devDependencies: {
        "@swc/core": "^1.3.106",
        "@types/lodash": "^4.14.202",
        "@types/papaparse": "^5.3.14",
        "@types/prompts": "^2.4.9",
        "@types/yargs": "^17.0.32",
        pkg: "^5.8.1",
        "ts-node": "^10.9.2",
        "ts-node-dev": "^2.0.0",
        tsup: "^8.0.1",
        typescript: "^5.3.3"
      }
    };
  }
});

// src/bin.ts
var _commander = require('commander');

// src/crawl.ts
var _fs = require('fs'); var fs = _interopRequireWildcard(_fs);
var _lodash = require('lodash'); var _lodash2 = _interopRequireDefault(_lodash);
var _chalk = require('chalk'); var _chalk2 = _interopRequireDefault(_chalk);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _playwrightextra = require('playwright-extra');
var _puppeteerextrapluginstealth = require('puppeteer-extra-plugin-stealth'); var _puppeteerextrapluginstealth2 = _interopRequireDefault(_puppeteerextrapluginstealth);

// src/features/input-keywords.ts

var inputKeywords = async (page, { SEARCH_FROM_DATE, SEARCH_TO_DATE, SEARCH_KEYWORDS, MODIFIED_SEARCH_KEYWORDS }) => {
  await page.waitForSelector('input[name="allOfTheseWords"]', {
    state: "visible"
  });
  await page.click('input[name="allOfTheseWords"]');
  if (SEARCH_FROM_DATE) {
    const [day, month, year] = SEARCH_FROM_DATE.split(" ")[0].split("-");
    MODIFIED_SEARCH_KEYWORDS += ` since:${year}-${month}-${day}`;
  }
  if (SEARCH_TO_DATE) {
    const [day, month, year] = SEARCH_TO_DATE.split(" ")[0].split("-");
    MODIFIED_SEARCH_KEYWORDS += ` until:${year}-${month}-${day}`;
  }
  console.info(_chalk2.default.yellow(`
Filling in keywords: ${MODIFIED_SEARCH_KEYWORDS}
`));
  await page.fill('input[name="allOfTheseWords"]', MODIFIED_SEARCH_KEYWORDS);
  await page.press('input[name="allOfTheseWords"]', "Enter");
};

// src/features/listen-network-requests.ts
var listenNetworkRequests = async (page) => {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.includes("SearchTimeline")) {
    }
    if (url.includes(".jpg") || url.includes(".png") || url.includes(".mp4") || url.includes("format=jpg")) {
      return route.abort();
    }
    route.continue();
  });
};

// src/env.ts
var _dotenv = require('dotenv');
var _znv = require('znv');
_dotenv.config.call(void 0, );
var {
  DEV_ACCESS_TOKEN: ACCESS_TOKEN,
  HEADLESS_MODE,
  ENABLE_EXPONENTIAL_BACKOFF
} = _znv.parseEnv.call(void 0, process.env, {
  DEV_ACCESS_TOKEN: _znv.z.string().min(1).optional(),
  HEADLESS_MODE: _znv.z.boolean().default(true),
  ENABLE_EXPONENTIAL_BACKOFF: _znv.z.boolean().default(false)
});

// src/features/exponential-backoff.ts
var baseTimeout = 6e4;
var maximumTimeout = 6e5;
var ratio = 2;
var calculateForRateLimit = (attempt) => {
  if (!ENABLE_EXPONENTIAL_BACKOFF) {
    return baseTimeout;
  }
  const timeout = ratio * attempt * baseTimeout + baseTimeout;
  return timeout > maximumTimeout ? maximumTimeout : timeout;
};

// src/constants.ts
var _dayjs = require('dayjs'); var _dayjs2 = _interopRequireDefault(_dayjs);

var TWITTER_SEARCH_ADVANCED_URL = {
  TOP: "https://x.com/search-advanced",
  LATEST: "https://x.com/search-advanced?f=live"
};
var NOW = _dayjs2.default.call(void 0, ).format("DD-MM-YYYY HH-mm-ss");
var FOLDER_DESTINATION = "./tweets-data";
var FUlL_PATH_FOLDER_DESTINATION = _path2.default.resolve(FOLDER_DESTINATION);
var FILTERED_FIELDS = [
  "created_at",
  "id_str",
  "full_text",
  "quote_count",
  "reply_count",
  "retweet_count",
  "favorite_count",
  "lang",
  "user_id_str",
  "conversation_id_str",
  "username",
  "tweet_url",
  "image_url",
  "location",
  "in_reply_to_screen_name"
];

// src/cache.ts
var cache = /* @__PURE__ */ new Map([["got_tweets" /* GOT_TWEETS */, false]]);

// src/helpers/page.helper.ts

var scrollUp = async (page) => {
  await page.evaluate(
    () => window.scrollTo({
      behavior: "smooth",
      top: 0
    })
  );
};
var scrollDown = async (page) => {
  await page.evaluate(
    () => (
      // scroll to the bottom of the page
      window.scrollTo({
        behavior: "smooth",
        top: document.body.scrollHeight
      })
    )
  );
  await page.evaluate(() => document.querySelectorAll("a div[data-testid='tweetPhoto']").forEach((el) => el.remove()));
  await page.evaluate(() => document.querySelectorAll("a div[aria-label='Image']").forEach((el) => el.remove()));
  await page.evaluate(() => document.querySelectorAll("div[data-testid='tweetPhoto']").forEach((el) => el.remove()));
};
var logError = (message) => {
  const appVersion = require_package().version;
  const messageWithVersion = `${_chalk2.default.gray(`[v${appVersion}]`)} ${message}`;
  console.error(messageWithVersion);
};

// src/crawl.ts
var _papaparse = require('papaparse'); var _papaparse2 = _interopRequireDefault(_papaparse);

_playwrightextra.chromium.use(_puppeteerextrapluginstealth2.default.call(void 0, ));
var headerWritten = false;
function appendCsv(pathStr, jsonData) {
  const fileName = _path2.default.resolve(pathStr);
  const csv = _papaparse2.default.unparse(jsonData, {
    quotes: true,
    // Wrap every datum in quotes
    header: !headerWritten,
    // Write header only if it's not written yet
    skipEmptyLines: true
    // Don't write empty lines
  });
  headerWritten = true;
  fs.appendFileSync(fileName, csv);
  fs.appendFileSync(fileName, "\r\n");
  return fileName;
}
async function crawl({
  ACCESS_TOKEN: ACCESS_TOKEN2,
  SEARCH_KEYWORDS,
  TWEET_THREAD_URL,
  SEARCH_FROM_DATE,
  SEARCH_TO_DATE,
  TARGET_TWEET_COUNT = 10,
  // default delay each tweet activity: 3 seconds
  DELAY_EACH_TWEET_SECONDS = 3,
  DELAY_EVERY_100_TWEETS_SECONDS = 10,
  DEBUG_MODE,
  OUTPUT_FILENAME,
  SEARCH_TAB = "LATEST",
  CSV_INSERT_MODE = "REPLACE"
}) {
  const CRAWL_MODE = TWEET_THREAD_URL ? "DETAIL" : "SEARCH";
  const SWITCHED_SEARCH_TAB = SEARCH_TAB === "TOP" ? "LATEST" : "TOP";
  const IS_DETAIL_MODE = CRAWL_MODE === "DETAIL";
  const IS_SEARCH_MODE = CRAWL_MODE === "SEARCH";
  const REACH_TIMEOUT_MAX = 3;
  const TIMEOUT_LIMIT = 20;
  let MODIFIED_SEARCH_KEYWORDS = SEARCH_KEYWORDS;
  const CURRENT_PACKAGE_VERSION = require_package().version;
  const filename = (OUTPUT_FILENAME || `${SEARCH_KEYWORDS} ${NOW}`).trim().replace(".csv", "");
  const FILE_NAME = `${FOLDER_DESTINATION}/${filename}.csv`.replace(/ /g, "_").replace(/:/g, "-");
  console.info(_chalk2.default.blue("\nOpening twitter search page...\n"));
  if (CSV_INSERT_MODE === "REPLACE" && fs.existsSync(FILE_NAME)) {
    console.info(
      _chalk2.default.blue(`
Found existing file ${FILE_NAME}, renaming to ${FILE_NAME.replace(".csv", ".old.csv")}`)
    );
    fs.renameSync(FILE_NAME, FILE_NAME.replace(".csv", ".old.csv"));
  }
  let TWEETS_NOT_FOUND_ON_CURRENT_TAB = false;
  const browser = await _playwrightextra.chromium.launch({ headless: HEADLESS_MODE });
  const context = await browser.newContext({
    screen: { width: 1240, height: 1080 },
    storageState: {
      cookies: [
        {
          name: "auth_token",
          value: ACCESS_TOKEN2,
          domain: "x.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Strict"
        }
      ],
      origins: []
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60 * 1e3);
  listenNetworkRequests(page);
  async function startCrawlTwitter({
    twitterSearchUrl = TWITTER_SEARCH_ADVANCED_URL[SEARCH_TAB]
  } = {}) {
    if (IS_DETAIL_MODE) {
      await page.goto(TWEET_THREAD_URL);
    } else {
      await page.goto(twitterSearchUrl);
    }
    const isLoggedIn = !page.url().includes("/login");
    if (!isLoggedIn) {
      logError("Invalid twitter auth token. Please check your auth token");
      return browser.close();
    }
    if (IS_SEARCH_MODE) {
      inputKeywords(page, {
        SEARCH_FROM_DATE,
        SEARCH_TO_DATE,
        SEARCH_KEYWORDS,
        MODIFIED_SEARCH_KEYWORDS
      });
    }
    let timeoutCount = 0;
    let additionalTweetsCount = 0;
    let reachTimeout = 0;
    let rateLimitCount = 0;
    const allData = {
      tweets: []
    };
    async function scrollAndSave() {
      while (allData.tweets.length < TARGET_TWEET_COUNT && (timeoutCount < TIMEOUT_LIMIT || reachTimeout < REACH_TIMEOUT_MAX)) {
        if (timeoutCount > TIMEOUT_LIMIT && reachTimeout < REACH_TIMEOUT_MAX) {
          reachTimeout++;
          console.info(_chalk2.default.yellow(`Timeout reached ${reachTimeout} times, making sure again...`));
          timeoutCount = 0;
          await scrollUp(page);
          await page.waitForTimeout(2e3);
          await scrollDown(page);
        }
        const response = await Promise.race([
          // includes "SearchTimeline" because it's the endpoint for the search result
          // or also includes "TweetDetail" because it's the endpoint for the tweet detail
          page.waitForResponse(
            (response2) => response2.url().includes("SearchTimeline") || response2.url().includes("TweetDetail")
          ),
          page.waitForTimeout(1500)
        ]);
        if (response) {
          timeoutCount = 0;
          let tweets = [];
          let responseJson;
          try {
            responseJson = await response.json();
          } catch (error) {
            cache.set("got_tweets" /* GOT_TWEETS */, false);
            if ((await response.text()).toLowerCase().includes("rate limit")) {
              logError(`Error parsing response json: ${JSON.stringify(response)}`);
              logError(
                `Most likely, you have already exceeded the Twitter rate limit. Read more on https://x.com/elonmusk/status/1675187969420828672.`
              );
              await page.waitForTimeout(calculateForRateLimit(rateLimitCount++));
              await page.click("text=Retry");
              return await scrollAndSave();
            }
            break;
          }
          rateLimitCount = 0;
          const isTweetDetail = responseJson.data.threaded_conversation_with_injections_v2;
          if (isTweetDetail) {
            tweets = _optionalChain([responseJson, 'access', _2 => _2.data, 'optionalAccess', _3 => _3.threaded_conversation_with_injections_v2, 'access', _4 => _4.instructions, 'access', _5 => _5[0], 'access', _6 => _6.entries]);
          } else {
            tweets = _optionalChain([responseJson, 'access', _7 => _7.data, 'optionalAccess', _8 => _8.search_by_raw_query, 'access', _9 => _9.search_timeline, 'access', _10 => _10.timeline, 'optionalAccess', _11 => _11.instructions, 'optionalAccess', _12 => _12[0], 'optionalAccess', _13 => _13.entries]);
          }
          if (!tweets) {
            logError("No more tweets found, please check your search criteria and csv file result");
            return;
          }
          if (!tweets.length) {
            if (await page.getByText("No results for").count()) {
              TWEETS_NOT_FOUND_ON_CURRENT_TAB = true;
              console.info("No tweets found for the search criteria");
              break;
            }
          }
          cache.set("got_tweets" /* GOT_TWEETS */, true);
          const tweetContents = tweets.map((tweet) => {
            const isPromotedTweet = tweet.entryId.includes("promoted");
            if (IS_SEARCH_MODE && !_optionalChain([tweet, 'optionalAccess', _14 => _14.content, 'optionalAccess', _15 => _15.itemContent, 'optionalAccess', _16 => _16.tweet_results, 'optionalAccess', _17 => _17.result])) return null;
            if (IS_DETAIL_MODE) {
              if (!_optionalChain([tweet, 'optionalAccess', _18 => _18.content, 'optionalAccess', _19 => _19.items, 'optionalAccess', _20 => _20[0], 'optionalAccess', _21 => _21.item, 'optionalAccess', _22 => _22.itemContent])) return null;
              const isMentionThreadCreator = _optionalChain([tweet, 'optionalAccess', _23 => _23.content, 'optionalAccess', _24 => _24.items, 'optionalAccess', _25 => _25[0], 'optionalAccess', _26 => _26.item, 'optionalAccess', _27 => _27.itemContent, 'optionalAccess', _28 => _28.tweet_results, 'optionalAccess', _29 => _29.result, 'optionalAccess', _30 => _30.legacy, 'optionalAccess', _31 => _31.entities, 'optionalAccess', _32 => _32.user_mentions, 'optionalAccess', _33 => _33[0]]);
              if (!isMentionThreadCreator) return null;
            }
            if (isPromotedTweet) return null;
            const result = IS_SEARCH_MODE ? tweet.content.itemContent.tweet_results.result : tweet.content.items[0].item.itemContent.tweet_results.result;
            if (!_optionalChain([result, 'access', _34 => _34.tweet, 'optionalAccess', _35 => _35.core, 'optionalAccess', _36 => _36.user_results]) && !_optionalChain([result, 'access', _37 => _37.core, 'optionalAccess', _38 => _38.user_results])) return null;
            const tweetContent = result.legacy || result.tweet.legacy;
            const userContent = _optionalChain([result, 'access', _39 => _39.core, 'optionalAccess', _40 => _40.user_results, 'optionalAccess', _41 => _41.result, 'optionalAccess', _42 => _42.legacy]) || result.tweet.core.user_results.result.legacy;
            const userProfile = _optionalChain([result, 'access', _43 => _43.core, 'optionalAccess', _44 => _44.user_results, 'optionalAccess', _45 => _45.result, 'optionalAccess', _46 => _46.core]);
            return {
              tweet: tweetContent,
              user: userContent,
              userProfile
            };
          }).filter((tweet) => tweet !== null);
          allData.tweets.push(...tweetContents);
          const comingTweets = tweetContents;
          if (!fs.existsSync(FOLDER_DESTINATION)) {
            const dir = fs.mkdirSync(FOLDER_DESTINATION, { recursive: true });
            const dirFullPath = _path2.default.resolve(dir);
            console.info(_chalk2.default.green(`Created new directory: ${dirFullPath}`));
          }
          const rows = comingTweets.map((current) => {
            const tweet = _lodash.pick.call(void 0, current.tweet, FILTERED_FIELDS);
            let cleanTweetText = tweet.full_text;
            cleanTweetText = cleanTweetText.replace(/\s\s+/g, " ");
            if (IS_DETAIL_MODE) {
              const firstWord = cleanTweetText.split(" ")[0];
              const replyToUsername = current.tweet.entities.user_mentions[0].screen_name;
              if (firstWord[1] === "@") {
                cleanTweetText = cleanTweetText.replace(`@${replyToUsername} `, "");
              }
            }
            tweet["full_text"] = cleanTweetText;
            tweet["username"] = _optionalChain([current, 'access', _47 => _47.userProfile, 'optionalAccess', _48 => _48.screen_name]);
            tweet["tweet_url"] = `https://x.com/${_optionalChain([current, 'access', _49 => _49.userProfile, 'optionalAccess', _50 => _50.screen_name])}/status/${tweet.id_str}`;
            tweet["image_url"] = _optionalChain([current, 'access', _51 => _51.tweet, 'access', _52 => _52.entities, 'optionalAccess', _53 => _53.media, 'optionalAccess', _54 => _54[0], 'optionalAccess', _55 => _55.media_url_https]) || "";
            tweet["location"] = current.user.location || "";
            tweet["in_reply_to_screen_name"] = current.tweet.in_reply_to_screen_name || "";
            return tweet;
          });
          const sortedArrayOfObjects = _lodash2.default.map(rows, (obj) => _lodash2.default.fromPairs(_lodash2.default.sortBy(Object.entries(obj), 0)));
          const fullPathFilename = appendCsv(FILE_NAME, sortedArrayOfObjects);
          console.info(_chalk2.default.blue(`

Your tweets saved to: ${fullPathFilename}`));
          console.info(_chalk2.default.yellow(`Total tweets saved: ${allData.tweets.length}`));
          additionalTweetsCount += comingTweets.length;
          if (additionalTweetsCount > 100) {
            additionalTweetsCount = 0;
            if (DELAY_EVERY_100_TWEETS_SECONDS) {
              console.info(_chalk2.default.gray(`
--Taking a break, waiting for ${DELAY_EVERY_100_TWEETS_SECONDS} seconds...`));
              await page.waitForTimeout(DELAY_EVERY_100_TWEETS_SECONDS * 1e3);
            }
          } else if (additionalTweetsCount > 20) {
            await page.waitForTimeout(DELAY_EACH_TWEET_SECONDS * 1e3);
          }
          cache.set("got_tweets" /* GOT_TWEETS */, false);
        } else {
          if (cache.get("got_tweets" /* GOT_TWEETS */) === false) {
            timeoutCount++;
            if (timeoutCount === 1) {
              process.stdout.write(_chalk2.default.gray(`
-- Scrolling... (${timeoutCount})`));
            } else {
              process.stdout.write(_chalk2.default.gray(` (${timeoutCount})`));
            }
            if (timeoutCount > TIMEOUT_LIMIT) {
              console.info(_chalk2.default.yellow("No more tweets found, please check your search criteria and csv file result"));
              break;
            }
          }
          await scrollDown(page);
          await scrollAndSave();
        }
        await scrollDown(page);
      }
    }
    await scrollAndSave();
    if (allData.tweets.length) {
      console.info(`Got ${allData.tweets.length} tweets, done scrolling...`);
    } else {
      console.info("No tweets found for the search criteria");
    }
  }
  try {
    await startCrawlTwitter();
    if (TWEETS_NOT_FOUND_ON_CURRENT_TAB) {
      console.info(`No tweets found on "${SEARCH_TAB}" tab, trying "${SWITCHED_SEARCH_TAB}" tab...`);
      await startCrawlTwitter({
        twitterSearchUrl: TWITTER_SEARCH_ADVANCED_URL[SWITCHED_SEARCH_TAB]
      });
    }
  } catch (error) {
    logError(error);
    console.info(_chalk2.default.blue(`Keywords: ${MODIFIED_SEARCH_KEYWORDS}`));
    console.info(_chalk2.default.yellowBright("Twitter Harvest v", CURRENT_PACKAGE_VERSION));
    const errorFilename = FUlL_PATH_FOLDER_DESTINATION + `/Error-${NOW}.png`.replace(/ /g, "_").replace(".csv", "");
    await page.screenshot({ path: _path2.default.resolve(errorFilename) }).then(() => {
      console.log(
        _chalk2.default.red(
          `
If you need help, please send this error screenshot to the maintainer, it was saved to "${_path2.default.resolve(
            errorFilename
          )}"`
        )
      );
    });
  } finally {
    if (!DEBUG_MODE) {
      await browser.close();
    }
  }
}

// src/bin.ts

var _prompts = require('prompts'); var _prompts2 = _interopRequireDefault(_prompts);


var program = new (0, _commander.Command)();
var version = fs.default.readFileSync(_path2.default.join(__dirname, "..", "package.json"), "utf8").match(/"version": "(.*?)"/)[1];
program.name("npx x-crawl").version(version);
program.addOption(new (0, _commander.Option)("-t, --token <type>", "Twitter auth token")).addOption(new (0, _commander.Option)("-f, --from <type>", "From date (DD-MM-YYYY)")).addOption(new (0, _commander.Option)("-to, --to <type>", "To date (DD-MM-YYYY)")).addOption(new (0, _commander.Option)("-s, --search-keyword <type>", "Search keyword")).addOption(new (0, _commander.Option)("--thread <type>", "Tweet thread URL")).addOption(new (0, _commander.Option)("-l, --limit <number>", "Limit number of tweets to crawl").argParser(parseInt)).addOption(new (0, _commander.Option)("-d, --delay <number>", "Delay between each tweet (in seconds)").default(3).argParser(parseInt)).addOption(new (0, _commander.Option)("-o, --output-filename <type>", "Output filename")).addOption(new (0, _commander.Option)("--tab <type>", "Search tab").choices(["TOP", "LATEST"]).default("TOP"));
function showWelcomeMessage() {
  console.log(_chalk2.default.bold.green(`x-crawl [v${version}]
`));
  console.log(
    _chalk2.default.blue("Research by ") + _chalk2.default.bold.blue("Helmi Satria & Modified by Ishal") + _chalk2.default.blue("\nUse it for Educational Purposes only!\n")
  );
  console.log(
    _chalk2.default.yellow(
      `This script uses Chromium Browser to crawl data from Twitter with ${_chalk2.default.bold("your Twitter auth token")}.`
    )
  );
  console.log(_chalk2.default.yellow("Please enter your Twitter auth token when prompted.\n"));
  console.log(_chalk2.default.red.bold("Note:") + " Keep your access token secret! Don't share it with anyone else.");
  console.log(_chalk2.default.red.bold("Note:") + " This script only runs on your local device.\n");
}
async function main() {
  showWelcomeMessage();
  program.parse(process.argv);
  const options = program.opts();
  let needPrompts = false;
  const questions = [];
  if (!options.token) {
    needPrompts = true;
    questions.push({
      type: "password",
      name: "token",
      message: `What's your Twitter auth token?`,
      validate: (value) => value.length >= 30 ? true : "Please enter a valid Twitter auth token"
    });
  }
  if (!options.searchKeyword && !options.thread) {
    needPrompts = true;
    questions.push({
      type: "text",
      name: "searchKeyword",
      message: "What's the search keyword?",
      validate: (value) => value.length > 0 ? true : "Please enter a search keyword"
    });
  }
  if (!options.limit) {
    needPrompts = true;
    questions.push({
      type: "number",
      name: "limit",
      message: "How many tweets do you want to crawl?",
      validate: (value) => value > 0 ? true : "Please enter a number greater than 0"
    });
  }
  if (needPrompts) {
    const answers = await _prompts2.default.call(void 0, questions, {
      onCancel: () => {
        console.info("Exiting...");
        process.exit(0);
      }
    });
    Object.assign(options, answers);
  }
  try {
    crawl({
      ACCESS_TOKEN: options.token,
      SEARCH_KEYWORDS: options.searchKeyword,
      TWEET_THREAD_URL: options.thread,
      SEARCH_FROM_DATE: options.from,
      SEARCH_TO_DATE: options.to,
      TARGET_TWEET_COUNT: options.limit,
      DELAY_EACH_TWEET_SECONDS: options.delay,
      OUTPUT_FILENAME: options.outputFilename,
      SEARCH_TAB: options.tab.toUpperCase()
    });
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}
main();
