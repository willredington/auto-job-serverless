import { SQSHandler } from "aws-lambda";
import { ScrapeJobDetailEvent } from "model/event";
import { Company, JobDetail, Tag } from "model/job-detail";
import axios from "axios";
import * as jsdom from "jsdom";
import { v4 as uuidv4 } from "uuid";

import "source-map-support/register";
import { String } from "aws-sdk/clients/apigateway";
import { DynamoDB } from "aws-sdk";

const dynamoDb = new DynamoDB.DocumentClient();

const getTags = (dom: jsdom.JSDOM) => {
  let tags: Tag[] = [];

  const aboutElement = dom.window.document.querySelector(
    "div.job-details--about"
  );

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
};

const getTechnologies = (dom: jsdom.JSDOM) => {
  let technologies: String[] = [];

  dom.window.document.querySelectorAll("a.post-tag").forEach((tagElement) => {
    technologies.push(tagElement.textContent);
  });

  return technologies;
};

const getCompany = (dom: jsdom.JSDOM) => {
  let company!: Company;

  const headerElement = dom.window.document.querySelector(
    "header.job-details--header"
  );

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
};

const getDescription = (dom: jsdom.JSDOM) => {
  return dom.window.document
    .querySelector("section.fs-body2")
    .textContent.replace("Job description", "")
    .trim();
};

const getDetails = async (jobEvent: ScrapeJobDetailEvent) => {
  try {
    const response = await axios.get(jobEvent.link);
    const dom = new jsdom.JSDOM(response.data);

    const tags = getTags(dom);
    const company = getCompany(dom);
    const description = getDescription(dom);
    const technologies = getTechnologies(dom);

    return {
      name: jobEvent.name,
      link: jobEvent.link,
      description,
      company,
      tags,
      technologies,
    } as JobDetail;
  } catch (err) {
    console.error(err);
  }
};

export const createDetails = async (jobDetail: JobDetail) => {
  return dynamoDb
    .put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        Id: uuidv4(),
        ...jobDetail,
      },
    })
    .promise();
};

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const jobEvent = JSON.parse(record.body) as ScrapeJobDetailEvent;

    // scrape job details
    const jobDetails = await getDetails(jobEvent);

    // create the record
    await createDetails(jobDetails);
  }
};
