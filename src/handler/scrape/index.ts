import { SQSHandler } from "aws-lambda";
import "source-map-support/register";

import * as jsdom from "jsdom";
import axios from "axios";

type ScrapeParams = {
  search: string;
  locaton: string;
};

const listJobs = async (params: ScrapeParams) => {
  console.log("using params", params);

  let pageIndex = 0;

  try {
    const response = await axios.get(
      `https://stackoverflow.com/jobs?q=${params.search}&r=true&sort=i&pg=${pageIndex}`
    );

    if (response.data) {
      const dom = new jsdom.JSDOM(response.data);

      dom.window.document
        .querySelectorAll("div.-job")
        .forEach((jobListingElement) => {
          const titleElement = jobListingElement.querySelector("a.s-link");

          const title = titleElement.textContent;
          const partialLink = titleElement.getAttribute("href");
          const absUrl = `https://stackoverflow.com${partialLink}`;

          console.log(`abs url: ${absUrl}`);
        });
    }
  } catch (err) {
    console.error(err);
  }
};

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { params } = JSON.parse(record.body);
    await listJobs(params as ScrapeParams);
  }
};
