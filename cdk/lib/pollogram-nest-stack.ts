import { Alias, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import path from 'path'
import { LambdaRestApi, Cors } from 'aws-cdk-lib/aws-apigateway'

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PollogramStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    const stage: string = process.env.STAGE || 'prod'
    const pollogramApiFn = new NodejsFunction(this, 'PollogramNest', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../src/lambda.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
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
        nodeModules: [
          // Explicitly include these modules
          '@nestjs/core',
          '@nestjs/common',
          '@nestjs/platform-express',
        ],
      },
    })
    // create alias for versioning
    const alias = new Alias(this, 'PolligramNestAlias', {
      aliasName: 'pollogram-nest-live',
      version: pollogramApiFn.currentVersion,
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
      },
    })
    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'PollogramNestApiUrl',
    })
  }
}
