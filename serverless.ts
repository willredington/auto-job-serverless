import type { Serverless } from "serverless/aws";

const serverlessConfiguration: Serverless = {
  service: "auto-job",
  frameworkVersion: "2",
  custom: {
    webpack: {
      webpackConfig: "./webpack.config.js",
      includeModules: true,
    },
  },
  // Add the serverless-webpack plugin
  plugins: ["serverless-webpack", "serverless-webpack-layers"],
  provider: {
    name: "aws",
    runtime: "nodejs12.x",
    region: "us-east-1",
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      DYNAMODB_TABLE: "JobDetail",
    },
  },
  layers: {
    lib: {
      path: "lib",
      name: "node-modules",
      retain: true,
    },
  },
  functions: {
    list: {
      handler: "src/handler/list/index.handler",
      layers: ["{Ref: LibLambdaLayer}"],
      events: [
        {
          sqs: {
            arn: "arn:aws:sqs:us-east-1:992256429851:job-event.fifo",
          },
        },
      ],
    },
    // detail: {
    //   handler: "src/handler/detail/index.handler",
    //   events: [
    //     {
    //       sqs: {
    //         arn: "arn:aws:sqs:us-east-1:992256429851:job-scraping-queue",
    //       },
    //     },
    //   ],
    // },
  },
  resources: {
    Resources: {
      JobTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "${self:provider.environment.DYNAMODB_TABLE}",
          AttributeDefinitions: [
            {
              AttributeName: "Id",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "Id",
              KeyType: "HASH",
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
