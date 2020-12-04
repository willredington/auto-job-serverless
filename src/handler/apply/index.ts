import { SQSHandler } from "aws-lambda";
import { SQS } from "aws-sdk";
import { ApplyJobDetailEvent } from "model/event";

const sqs = new SQS();

export const handler: SQSHandler = async (event, _) => {
  for (const record of event.Records) {
    const applyEvent = JSON.parse(record.body) as ApplyJobDetailEvent;
    console.log("apply event", applyEvent.jobDetailId);
  }
};
