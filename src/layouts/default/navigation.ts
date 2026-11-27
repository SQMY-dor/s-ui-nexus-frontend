export interface NavItem {
  title: string
  icon: string
  path: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface NavMatch {
  groupTitle: string
  itemTitle: string
  icon: string
  path: string
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'navigation.overview',
    items: [
      { title: 'pages.home', icon: 'mdi-view-dashboard-outline', path: '/' },
      { title: 'pages.analytics', icon: 'mdi-chart-line', path: '/analytics' },
    ],
  },
  {
    title: 'navigation.access',
    items: [
      { title: 'pages.clients', icon: 'mdi-account-multiple-outline', path: '/clients' },
      { title: 'pages.inbounds', icon: 'mdi-login', path: '/inbounds' },
      { title: 'pages.tls', icon: 'mdi-certificate-outline', path: '/tls' },
    ],
  },
  {
    title: 'navigation.network',
    items: [
      { title: 'pages.outbounds', icon: 'mdi-logout-variant', path: '/outbounds' },
      { title: 'pages.endpoints', icon: 'mdi-vpn', path: '/endpoints' },
      { title: 'pages.config', icon: 'mdi-routes', path: '/config' },
    ],
  },
  {
    title: 'navigation.operations',
    items: [
      { title: 'pages.nodes', icon: 'mdi-lan', path: '/nodes' },
      { title: 'pages.domains', icon: 'mdi-shield-lock-outline', path: '/domains' },
      { title: 'pages.services', icon: 'mdi-server-network-outline', path: '/services' },
      { title: 'pages.settings', icon: 'mdi-cog-outline', path: '/settings' },
      { title: 'pages.admins', icon: 'mdi-account-key-outline', path: '/admins' },
    ],
  },
]

export function findNavMatch(path: string): NavMatch | undefined {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => entry.path === path)
    if (item) {
      return {
        groupTitle: group.title,
        itemTitle: item.title,
        icon: item.icon,
        path: item.path,
      }
    }
  }
  return undefined
}
