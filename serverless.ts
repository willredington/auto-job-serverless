import type { Serverless } from "serverless/aws";

const serverlessConfiguration: Serverless = {
  service: {
    name: "auto-job",
  },
  frameworkVersion: "2",
  custom: {
    webpack: {
      webpackConfig: "./webpack.config.js",
      includeModules: true,
    },
  },
  // Add the serverless-webpack plugin
  plugins: ["serverless-webpack"],
  provider: {
    name: "aws",
    runtime: "nodejs12.x",
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    },
  },
  functions: {
    list: {
      handler: "src/handler/list/index.handler",
      events: [
        {
          sqs: {
            arn: "arn:aws:sqs:us-east-1:992256429851:job-event.fifo",
          },
        },
      ],
    },
  },
};

module.exports = serverlessConfiguration;
