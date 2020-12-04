import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SQS } from "aws-sdk";
import { ScrapeJobListingEvent } from "model/event";
import { CreateJobTriggerRequest } from "model/request";
import { v4 as uuidv4 } from "uuid";

const sqs = new SQS();

export const handler: APIGatewayProxyHandlerV2 = async (event, _) => {
  const payload = JSON.parse(event.body);
  const queueUrl = process.env.TRIGGER_QUEUE_URL;

  const containsAllRequiredKeys = ["search", "location"].every((key) =>
    payload.hasOwnProperty(key)
  );

  if (!containsAllRequiredKeys) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "bad request, missing required keys",
      }),
    };
  }

  const request = payload as CreateJobTriggerRequest;

  try {
    const jobEvent: ScrapeJobListingEvent = {
      uuid: uuidv4(),
      type: "scrape-listing",
      ...request,
    };

    await sqs
      .sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(jobEvent),
      })
      .promise();

    return {
      statusCode: 200,
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "an error occurred",
      }),
    };
  }
};
