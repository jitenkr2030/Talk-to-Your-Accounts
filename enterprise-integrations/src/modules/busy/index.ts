// Busy Accounting Software Integration Module
// Exports all Busy integration services and utilities

export { BusyConnectorService } from './BusyConnectorService';
export { BusySyncService } from './BusySyncService';
export { BusyXMLGenerator } from './BusyXMLGenerator';
export { BUSY_CONFIG } from './BusyConfig';

// Singleton instance for easy access
let busyService: BusySyncService | null = null;
let busyConnector: BusyConnectorService | null = null;

/**
 * Get Busy Sync Service singleton
 */
export function getBusyService(): BusySyncService {
  if (!busyService) {
    busyService = new BusySyncService();
  }
  return busyService;
}

/**
 * Get Busy Connector Service singleton
 */
export function getBusyConnector(): BusyConnectorService {
  if (!busyConnector) {
    busyConnector = new BusyConnectorService();
  }
  return busyConnector;
}

/**
 * Initialize Busy integration
 */
export async function initializeBusyIntegration(): Promise<void> {
  const service = getBusyService();
  const status = await service.getSyncStatus();
  
  console.log('[Busy Integration] Initialized successfully');
  console.log('[Busy Integration] Status:', {
    isConnected: status.isConnected,
    companyName: status.companyName,
    version: status.busyVersion,
    lastSync: status.lastSync
  });
}

/**
 * Quick check if Busy is accessible
 */
export async function isBusyAccessible(): Promise<boolean> {
  const connector = getBusyConnector();
  const status = await connector.checkConnection();
  return status.isConnected;
}

/**
 * Get Busy company information
 */
export async function getBusyCompanyInfo(): Promise<any> {
  const connector = getBusyConnector();
  return connector.getCompanyInfo();
}

/**
 * Sync all data with Busy
 */
export async function syncAllData(): Promise<any> {
  const service = getBusyService();
  return service.syncAll({
    syncParties: true,
    syncItems: true,
    syncTransactions: true,
    importToBusy: true,
    exportFromBusy: true
  });
}

/**
 * Get sync status
 */
export async function getBusySyncStatus(): Promise<any> {
  const service = getBusyService();
  return service.getSyncStatus();
}

/**
 * Configure Busy connection settings
 */
export interface BusyConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

/**
 * Update Busy connection configuration
 */
export function configureBusyConnection(config: BusyConnectionConfig): void {
  // Update configuration dynamically
  // This would update the BUSY_CONFIG with new values
  console.log('[Busy Integration] Configuration updated:', config);
}

export default {
  getBusyService,
  getBusyConnector,
  initializeBusyIntegration,
  isBusyAccessible,
  getBusyCompanyInfo,
  syncAllData,
  getBusySyncStatus,
  configureBusyConnection
};
