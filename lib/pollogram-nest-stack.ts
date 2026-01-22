import { Alias, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import {
  LambdaRestApi,
  Cors,
  LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigateway'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { aws_apigateway } from 'aws-cdk-lib'

export class PollogramStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const stage: string = process.env.STAGE || 'prod'
    // validate required env vars
    const requiredEnvVars = [
      'ADMIN_SECRET_PHRASE',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'JWT_ACCESS_EXPIRATION',
      'JWT_REFRESH_EXPIRATION',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'DATABASE_URL',
      'CLOUDINARY_TARGET_FOLDER',
    ]
    requiredEnvVars.forEach((envVar) => {
      if (!process.env[envVar])
        throw new Error(`Missing required environment variable: ${envVar}`)
    })

    const pollogramApiFn = new NodejsFunction(this, 'PollogramNest', {
      runtime: Runtime.NODEJS_22_X,
      entry: 'src/lambda.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: stage === 'prod' ? 'production' : 'development',
        ADMIN_SECRET_PHRASE: process.env.ADMIN_SECRET_PHRASE!,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
        JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION!,
        JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION!,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
        DATABASE_URL: process.env.DATABASE_URL!,
        CLOUDINARY_TARGET_FOLDER: process.env.CLOUDINARY_TARGET_FOLDER!,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'es2021',
        externalModules: [
          'aws-sdk',
          '@nestjs/websockets',
          '@nestjs/microservices',
          '@nestjs/platform-socket.io',
        ],
      },
    })
    // create alias for versioning
    const alias = new Alias(this, 'PolligramNestAlias', {
      aliasName: 'pollogram-nest-live',
      version: pollogramApiFn.currentVersion,
    })

    const apiLogGroup = new LogGroup(this, 'ApiGatewayLogs', {
      retention: RetentionDays.ONE_WEEK,
      logGroupName: `/aws/apigateway/pollogram-${stage}`,
    })

    // REST API gw with lambda integration
    const api = new LambdaRestApi(this, 'PollogramNestApi', {
      handler: alias,
      restApiName: 'pollogram-nest',
      description: 'Pollogram Serverless API powered by NestJS',
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        cachingEnabled: true,
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new LogGroupLogDestination(apiLogGroup),
        accessLogFormat:
          aws_apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
    })
    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'PollogramNestApiUrl',
    })
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: pollogramApiFn.functionName,
      description: 'Lambda Function Name',
    })
  }
}
