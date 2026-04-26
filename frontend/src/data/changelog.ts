export interface ChangelogEntry {
  version: string
  date: string
  tag: 'NEW' | 'IMPROVED' | 'FIX'
  items: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-04-04',
    tag: 'NEW',
    items: [
      'Added retention diagnosis in Insights',
      'OAuth-connected creator analytics now available',
      'Scheduled daily refresh jobs',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-21',
    tag: 'IMPROVED',
    items: [
      'Channel sync pipeline with video indexing',
      'Trends page with 7D/30D/90D time ranges',
      'Background refresh with API quota management',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-03-10',
    tag: 'NEW',
    items: [
      'Multi-channel tracking',
      'Daily snapshot collection',
      'Channel overview with performance charts',
    ],
  },
]

export const CURRENT_VERSION = changelog[0].version
