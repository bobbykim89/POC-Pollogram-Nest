import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import serverlessExpress from '@vendia/serverless-express'
import { Callback, Context, Handler } from 'aws-lambda'
import express from 'express'

let cachedServer: Handler

async function bootstrap(): Promise<Handler> {
  if (!cachedServer) {
    console.log('Cold start - initializing NestJS app')
    const expressApp = express()
    const nestApp: INestApplication = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] },
    )
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    nestApp.enableCors()
    nestApp.setGlobalPrefix('api')
    await nestApp.init()
    console.log('NestJS app initialized successfully')
    cachedServer = serverlessExpress({ app: expressApp })
  }
  return cachedServer
}

export const handler: Handler = async (event, context, callback) => {
  console.log('Lambda invoked:', JSON.stringify(event))
  context.callbackWaitsForEmptyEventLoop = false // Important for DB connections

  try {
    const server = await bootstrap()
    return server(event, context, callback)
  } catch (error) {
    console.error('Lambda error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
      }),
    }
  }
}
