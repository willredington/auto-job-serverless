import { SQSHandler } from "aws-lambda";
import { JobDetail } from "model/job-detail";
import { v4 as uuidv4 } from "uuid";
import * as jsdom from "jsdom";
import axios from "axios";

import { SQS } from "aws-sdk";
import {
  BaseEvent,
  ScrapeJobDetailEvent,
  ScrapeJobListingEvent,
} from "model/event";

const sqs = new SQS();

// TODO: need to revist pagination at some point
const listJobs = async (jobEvent: ScrapeJobListingEvent) => {
  const pageIndex = 0;
  const details: Partial<JobDetail>[] = [];
  const link = `https://stackoverflow.com/jobs?q=${jobEvent.search}&r=true&sort=i&pg=${pageIndex}`;

  try {
    const response = await axios.get(link);

    const dom = new jsdom.JSDOM(response.data);

    dom.window.document.querySelectorAll("div.-job").forEach((jobListing) => {
      const titleElement = jobListing.querySelector("a.s-link");
      const titleLink = `https://stackoverflow.com${titleElement.getAttribute(
        "href"
      )}`;

      details.push({
        name: titleElement.textContent,
        link: titleLink,
      });
    });
  } catch (err) {
    console.error(err);
  }

  return details;
};

export const handler: SQSHandler = async (event, _) => {
  for (const record of event.Records) {
    const jobEvent = JSON.parse(record.body) as BaseEvent;

    if (jobEvent.type === "scrape-listing") {
      // scrape job details
      const jobDetails = await listJobs(jobEvent as ScrapeJobListingEvent);

      const queueUrl = process.env.SCRAPE_QUEUE_URL;

      // send job detail events to queue
      for (const jobDetail of jobDetails) {
        try {
          const detailEvent: ScrapeJobDetailEvent = {
            uuid: uuidv4(),
            type: "scrape-detail",
            name: jobDetail.name,
            link: jobDetail.link,
          };

          await sqs
            .sendMessage({
              QueueUrl: queueUrl,
              MessageBody: JSON.stringify(detailEvent),
            })
            .promise();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
};
