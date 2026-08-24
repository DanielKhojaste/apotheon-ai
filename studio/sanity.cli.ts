import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!projectId || !dataset) {
  throw new Error(
    'Missing Sanity configuration. Copy .env.example to .env.local and add your project ID and dataset.',
  )
}

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  deployment: {
    /**
     * Enable auto-updates for deployed Studios.
     * https://www.sanity.io/docs/studio/latest-version-of-sanity
     */
    autoUpdates: true,
  },
})
