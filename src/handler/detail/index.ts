import { SQSHandler } from "aws-lambda";
import { ScrapeJobDetailEvent } from "model/event";
import { Company, JobDetail, Tag } from "model/job-detail";
import * as puppeteer from "puppeteer";
import "source-map-support/register";

const getTags = async (page: puppeteer.Page) => {
  await page.waitForSelector("div.job-details--about");

  return await page.evaluate(() => {
    let tags: Tag[] = [];

    const aboutElement = document.querySelector("div.job-details--about");

    aboutElement.querySelectorAll("div.mb8").forEach((tagElement) => {
      const spanTags = tagElement.querySelectorAll("span");

      if (spanTags.length == 2) {
        const name = spanTags.item(0).textContent.replace(":", "").trim();
        const value = spanTags.item(1).textContent.trim();

        tags.push({
          name,
          value,
        });
      }
    });

    return tags;
  });
};

const getCompany = async (page: puppeteer.Page) => {
  await page.waitForSelector("header.job-details--header");

  return await page.evaluate(() => {
    let company!: Company;

    const headerElement = document.querySelector("header.job-details--header");

    headerElement.querySelectorAll("a").forEach((anchorTag) => {
      const link = anchorTag.getAttribute("href");

      if (link) {
        if (
          anchorTag.classList.contains("employer") ||
          (link.includes("companies") &&
            anchorTag.classList.contains("fc-black-700"))
        ) {
          company = {
            name: anchorTag.textContent,
            link,
          };

          return;
        }
      }
    });

    return company;
  });
};

const getDescription = async (page: puppeteer.Page) => {
  await page.waitForSelector("section.fs-body2");

  return page.evaluate(() => {
    return document
      .querySelector("section.fs-body2")
      .textContent.replace("Job description", "")
      .trim();
  });
};

const getDetails = async (
  jobEvent: ScrapeJobDetailEvent,
  browser: puppeteer.Browser
) => {
  let page!: puppeteer.Page;

  try {
    page = await browser.newPage();

    await page.goto(jobEvent.link);

    const tags = await getTags(page);
    const company = await getCompany(page);
    const description = await getDescription(page);

    return {
      name: jobEvent.name,
      link: jobEvent.link,
      description,
      company,
      tags,
      technologies: [],
    } as JobDetail;
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
      const jobEvent = JSON.parse(record.body) as ScrapeJobDetailEvent;
      console.log("job event", jobEvent);

      // scrape job details
      const jobDetails = await getDetails(jobEvent, browser);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
