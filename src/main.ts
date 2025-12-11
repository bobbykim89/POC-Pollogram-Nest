import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import express from 'express'
import { ExpressAdapter } from '@nestjs/platform-express'
import { INestApplication } from '@nestjs/common'

async function bootstrap() {
  const expressApp = express()
  const nestApp: INestApplication = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] },
  )
  // const app = await NestFactory.create(AppModule)
  nestApp.setGlobalPrefix('api')
  await nestApp.listen(process.env.PORT ?? 3000)
}
bootstrap()
