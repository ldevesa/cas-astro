import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '21wszpvy',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'qffx0c5rhi740mewbjh465do',
  },
})
