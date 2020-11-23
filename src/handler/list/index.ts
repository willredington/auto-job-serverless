import { SQSHandler } from "aws-lambda";
import { JobDetail } from "model/job-detail";
import { v4 as uuidv4 } from "uuid";
import * as puppeteer from "puppeteer";
import "source-map-support/register";

import { SQS } from "aws-sdk";
import { ScrapeJobDetailEvent, ScrapeJobListingEvent } from "model/event";

const sqs = new SQS();

const listJobs = async (
  jobEvent: ScrapeJobListingEvent,
  browser: puppeteer.Browser
) => {
  let pageIndex = 0;

  let page!: puppeteer.Page;

  try {
    page = await browser.newPage();

    const link = `https://stackoverflow.com/jobs?q=${jobEvent.search}&r=true&sort=i&pg=${pageIndex}`;

    await page.goto(link);

    // wait for job listings
    await page.waitForSelector("div.-job");

    // get the title and link for each listing
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
      const jobEvent = JSON.parse(record.body) as ScrapeJobListingEvent;
      console.log("job event", jobEvent);

      // scrape job details
      const jobDetails = await listJobs(jobEvent, browser);

      // send job detail events to queue
      for (const jobDetail of jobDetails) {
        try {
          const detailEvent: ScrapeJobDetailEvent = {
            uuid: uuidv4(),
            name: jobDetail.name,
            link: jobDetail.link,
          };

          await sqs
            .sendMessage({
              QueueUrl:
                "https://sqs.us-east-1.amazonaws.com/992256429851/job-scraping-queue",
              MessageBody: JSON.stringify(detailEvent),
            })
            .promise();
        } catch (err) {
          console.error(err);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
