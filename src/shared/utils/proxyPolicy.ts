import { PROXY_SCOPES } from '@shared/constants'
import type { Aria2EngineOptions, ProxyConfig } from '@shared/types'
import { isValidAria2ProxyUrl } from '@shared/utils/aria2Proxy'
import { hasProxyScope } from '@shared/utils/proxyUrl'

export const ENGINE_PROXY_MODES = ['direct', 'manual'] as const
export type EngineProxyMode = (typeof ENGINE_PROXY_MODES)[number]

export type TaskProxyMode = EngineProxyMode

export function normalizeProxyMode(mode: unknown): EngineProxyMode {
  return ENGINE_PROXY_MODES.includes(mode as EngineProxyMode) ? (mode as EngineProxyMode) : 'direct'
}

export function isProxyModeEnabled(mode: EngineProxyMode): boolean {
  return mode !== 'direct'
}

export function proxySwitchValueToMode(enabled: boolean): EngineProxyMode {
  return enabled ? 'manual' : 'direct'
}

function hasDownloadScope(proxy: Pick<ProxyConfig, 'scope'>): boolean {
  return hasProxyScope(proxy, PROXY_SCOPES.DOWNLOAD)
}

function clearProxyOptions(): Aria2EngineOptions {
  return {
    'all-proxy': '',
    'all-proxy-user': '',
    'all-proxy-passwd': '',
    'http-proxy': '',
    'http-proxy-user': '',
    'http-proxy-passwd': '',
    'https-proxy': '',
    'https-proxy-user': '',
    'https-proxy-passwd': '',
    'ftp-proxy': '',
    'ftp-proxy-user': '',
    'ftp-proxy-passwd': '',
    'no-proxy': '',
  }
}

function addProxyCredentials(options: Aria2EngineOptions, username?: string, password?: string): void {
  const cleanUsername = username?.trim() ?? ''
  const cleanPassword = password ?? ''
  if (!cleanUsername && !cleanPassword) return
  options['all-proxy-user'] = cleanUsername
  options['all-proxy-passwd'] = cleanPassword
}

export function buildDownloadProxyOptions(proxy: ProxyConfig): Aria2EngineOptions {
  if (!hasDownloadScope(proxy)) return clearProxyOptions()

  const mode = normalizeProxyMode(proxy.mode)
  if (mode !== 'manual') return clearProxyOptions()

  const server = proxy.server.trim()
  if (!server) return clearProxyOptions()

  const options: Aria2EngineOptions = {
    'all-proxy': server,
  }
  addProxyCredentials(options, proxy.username, proxy.password)
  if (proxy.bypass?.trim()) options['no-proxy'] = proxy.bypass.trim()
  return options
}

export function buildTaskProxyOptions(
  mode: TaskProxyMode,
  customProxy: string,
  appProxy?: ProxyConfig,
  customProxyUsername?: string,
  customProxyPassword?: string,
): Aria2EngineOptions {
  if (mode !== 'manual') return clearProxyOptions()

  const useCustomProxy = !!customProxy.trim()
  const server = useCustomProxy ? customProxy.trim() : (appProxy ? getDownloadProxy(appProxy)?.trim() : '') || ''
  if (!server) return clearProxyOptions()

  const options: Aria2EngineOptions = {
    'all-proxy': server,
  }
  if (useCustomProxy) {
    addProxyCredentials(options, customProxyUsername, customProxyPassword)
  } else if (appProxy) {
    addProxyCredentials(options, appProxy.username, appProxy.password)
  }

  const bypass = appProxy?.bypass?.trim()
  if (bypass) options['no-proxy'] = bypass
  return options
}

export function isManualDownloadProxy(proxy: ProxyConfig): boolean {
  return normalizeProxyMode(proxy.mode) === 'manual' && hasDownloadScope(proxy) && !!proxy.server.trim()
}

export function getDownloadProxy(proxy: ProxyConfig): string | undefined {
  return isManualDownloadProxy(proxy) ? proxy.server : undefined
}

export function getProxyServerFromOptions(options: Aria2EngineOptions): string {
  const proxy = options['all-proxy']
  return typeof proxy === 'string' ? proxy : ''
}

export function hasInvalidManualProxy(options: Aria2EngineOptions): boolean {
  const proxy = getProxyServerFromOptions(options)
  return !!proxy && !isValidAria2ProxyUrl(proxy)
}
