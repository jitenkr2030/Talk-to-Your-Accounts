// Tally Prime Integration Module
// Exports all Tally integration services and utilities

export { TallyConnectorService } from './TallyConnectorService';
export { TallySyncService } from './TallySyncService';
export { TallyXMLGenerator } from './TallyXMLGenerator';
export { TALLY_CONFIG } from './TallyConfig';

// Singleton instance for easy access
let tallyService: TallySyncService | null = null;
let tallyConnector: TallyConnectorService | null = null;

/**
 * Get Tally Sync Service singleton
 */
export function getTallyService(): TallySyncService {
  if (!tallyService) {
    tallyService = new TallySyncService();
  }
  return tallyService;
}

/**
 * Get Tally Connector Service singleton
 */
export function getTallyConnector(): TallyConnectorService {
  if (!tallyConnector) {
    tallyConnector = new TallyConnectorService();
  }
  return tallyConnector;
}

/**
 * Initialize Tally integration
 */
export async function initializeTallyIntegration(): Promise<void> {
  const service = getTallyService();
  const status = await service.getSyncStatus();
  
  console.log('[Tally Integration] Initialized successfully');
  console.log('[Tally Integration] Status:', {
    isConnected: status.isConnected,
    companyName: status.companyName,
    lastSync: status.lastSync
  });
}

/**
 * Quick check if Tally is accessible
 */
export async function isTallyAccessible(): Promise<boolean> {
  const connector = getTallyConnector();
  const status = await connector.checkConnection();
  return status.isConnected;
}

/**
 * Get Tally company information
 */
export async function getTallyCompanyInfo(): Promise<any> {
  const connector = getTallyConnector();
  return connector.getCompanyInfo();
}

/**
 * Sync all data with Tally
 */
export async function syncAllData(): Promise<any> {
  const service = getTallyService();
  return service.syncAll({
    syncParties: true,
    syncItems: true,
    syncTransactions: true,
    importToTally: true,
    exportFromTally: true
  });
}

/**
 * Get sync status
 */
export async function getTallySyncStatus(): Promise<any> {
  const service = getTallyService();
  return service.getSyncStatus();
}

export default {
  getTallyService,
  getTallyConnector,
  initializeTallyIntegration,
  isTallyAccessible,
  getTallyCompanyInfo,
  syncAllData,
  getTallySyncStatus
};
