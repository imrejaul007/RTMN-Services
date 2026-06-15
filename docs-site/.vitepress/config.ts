import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RTMN',
  description: 'Real-Time Multi-Industry Network - Operating System for Every Industry',
  srcDir: '.',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'RTMN Documentation' }],
    ['meta', { property: 'og:description', content: 'Operating System for Every Industry' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'RTMN',
    nav: [
      { text: 'Products', link: '/products/', activeMatch: '/products/' },
      { text: 'Docs', link: '/getting-started/', activeMatch: '/getting-started/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'Tutorials', link: '/tutorials/', activeMatch: '/tutorials/' },
      { text: 'Pricing', link: '/pricing/' },
      { text: 'Status', link: 'https://status.rtmn.io' },
    ],
    sidebar: {
      '/products/': [
        { text: 'Products', items: [
          { text: 'BrandPulse', link: '/products/brandpulse' },
          { text: 'Hotel OS', link: '/products/hotel-os' },
          { text: 'Restaurant OS', link: '/products/restaurant-os' },
          { text: 'All Products', link: '/products/' },
        ]},
      ],
      '/getting-started/': [
        { text: 'Getting Started', items: [
          { text: 'Quick Start', link: '/getting-started/quickstart' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Core Concepts', link: '/getting-started/concepts' },
          { text: 'Authentication', link: '/getting-started/authentication' },
        ]},
      ],
      '/api/': [
        { text: 'API Reference', items: [
          { text: 'Overview', link: '/api/overview' },
          { text: 'Authentication', link: '/api/authentication' },
          { text: 'Rate Limits', link: '/api/rate-limits' },
          { text: 'Errors', link: '/api/errors' },
          { text: 'Pagination', link: '/api/pagination' },
        ]},
      ],
      '/tutorials/': [
        { text: 'Tutorials', items: [
          { text: 'Build Dashboard', link: '/tutorials/dashboard' },
          { text: 'Set Up Alerts', link: '/tutorials/alerts' },
          { text: 'Connect Sources', link: '/tutorials/sources' },
          { text: 'Hotel Integration', link: '/tutorials/hotel-integration' },
        ]},
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rtmn-group' },
      { icon: 'twitter', link: 'https://twitter.com/rtmn' },
    ],
    footer: {
      message: 'RTMN Documentation',
      copyright: 'Copyright © 2024-2026 RTMN Group. All rights reserved.',
    },
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
