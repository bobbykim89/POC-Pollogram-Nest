import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module'
import serverlessExpress from '@vendia/serverless-express'
import { Callback, Context, Handler } from 'aws-lambda'
import express from 'express'

let cachedServer: Handler

async function bootstrap(): Promise<Handler> {
  if (!cachedServer) {
    const expressApp = express()
    const nestApp: INestApplication = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn'] },
    )
    nestApp.enableCors()
    nestApp.setGlobalPrefix('api')
    await nestApp.init()
    cachedServer = serverlessExpress({ app: expressApp })
  }
  return cachedServer
}

export const handler: Handler = async (event, context, callback) => {
  const server = await bootstrap()
  return server(event, context, callback)
}
