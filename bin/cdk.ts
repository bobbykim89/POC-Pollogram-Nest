#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { PollogramNestStages } from '../lib/pollogram-nest-stages'

const app = new cdk.App()
const APP_REGION: string = 'us-east-2'
new PollogramNestStages(app, 'Prod', {
  env: {
    region: APP_REGION,
  },
})
new PollogramNestStages(app, 'Dev', {
  env: {
    region: APP_REGION,
  },
})

app.synth()
