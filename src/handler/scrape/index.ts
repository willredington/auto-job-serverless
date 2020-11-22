import { SQSHandler } from "aws-lambda";
import { JobDetail } from "model/job-detail";
import * as puppeteer from "puppeteer";
import "source-map-support/register";

type ScrapeParams = {
  search: string;
  locaton: string;
};

const listJobs = async (params: ScrapeParams, browser: puppeteer.Browser) => {
  console.log("using params", params);

  let pageIndex = 0;

  let page!: puppeteer.Page;

  try {
    page = await browser.newPage();

    const link = `https://stackoverflow.com/jobs?q=${params.search}&r=true&sort=i&pg=${pageIndex}`;

    await page.goto(link);

    await page.waitForSelector("div.-job");

    return await page.evaluate(() => {
      const details: Partial<JobDetail>[] = [];

      document.querySelectorAll("div.-job").forEach((jobListing) => {
        const titleElement = jobListing.querySelector("a.s-link");
        const titleLink = `https://stackoverflow.com${titleElement.getAttribute(
          "href"
        )}`;

        details.push({
          name: titleElement.textContent,
          link: titleLink,
        });
      });

      return details;
    });
  } catch (err) {
    console.error(err);
  } finally {
    await page.close();
  }
};

export const handler: SQSHandler = async (event) => {
  let browser!: puppeteer.Browser;

  try {
    browser = await puppeteer.launch();

    for (const record of event.Records) {
      const { params } = JSON.parse(record.body);
      const jobDetails = await listJobs(params as ScrapeParams, browser);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
