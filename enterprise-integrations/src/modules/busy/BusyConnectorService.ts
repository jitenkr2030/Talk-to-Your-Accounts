import axios, { AxiosInstance, AxiosError } from 'axios';
import { BUSY_CONFIG } from './BusyConfig';
import { BusyXMLGenerator } from './BusyXMLGenerator';
import { CircuitBreakerService } from '../../core/resilience/CircuitBreakerService';
import { LoggerService } from '../../core/logging/LoggerService';

interface BusyResponse {
  RESPONSE?: {
    STATUS?: string;
    DATA?: any;
    ERROR?: string;
    MESSAGE?: string;
  };
}

interface BusyConnectionStatus {
  isConnected: boolean;
  companyName?: string;
  busyVersion?: string;
  error?: string;
}

/**
 * BusyConnectorService
 * 
 * Handles HTTP communication with Busy Accounting Software API
 * Implements connection pooling, retry logic, and circuit breaker
 */
export class BusyConnectorService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreakerService;
  private logger: LoggerService;
  private baseUrl: string;
  private authHeader: string;
  
  constructor() {
    this.baseUrl = `http://${BUSY_CONFIG.connection.host}:${BUSY_CONFIG.connection.port}`;
    
    // Set up basic auth if credentials are provided
    this.authHeader = '';
    if (BUSY_CONFIG.auth.type === 'basic' && BUSY_CONFIG.auth.credentials) {
      const { username, password } = BUSY_CONFIG.auth.credentials;
      if (username) {
        this.authHeader = `Basic ${Buffer.from(`${username}:${password || ''}`).toString('base64')}`;
      }
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: BUSY_CONFIG.connection.timeout,
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
        ...(this.authHeader ? { 'Authorization': this.authHeader } : {})
      }
    });
    
    this.circuitBreaker = new CircuitBreakerService({
      failureThreshold: 5,
      resetTimeout: 60000, // Longer reset for Busy as it may be less reliable
      halfOpenRequests: 2
    });
    
    this.logger = new LoggerService('BusyConnector');
  }
  
  /**
   * Check if Busy is running and accessible
   */
  async checkConnection(): Promise<BusyConnectionStatus> {
    try {
      const response = await this.sendRequest(BusyXMLGenerator.connectionTestRequest());
      
      if (response) {
        // Try to get company info as well
        try {
          const companyInfo = await this.getCompanyInfo();
          return {
            isConnected: true,
            companyName: companyInfo?.companyName || 'Unknown',
            busyVersion: companyInfo?.version
          };
        } catch {
          return {
            isConnected: true,
            companyName: 'Busy (Company info unavailable)'
          };
        }
      }
      
      return {
        isConnected: false,
        error: 'Connection test returned unsuccessful response'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Busy connection check failed', { error: errorMessage });
      
      return {
        isConnected: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Fetch company information from Busy
   */
  async getCompanyInfo(): Promise<any> {
    const xml = BusyXMLGenerator.fetchCompanyInfoRequest();
    const response = await this.sendRequest(xml);
    return this.parseCompanyResponse(response);
  }
  
  /**
   * Fetch all parties/ledgers from Busy
   */
  async getParties(partyType?: string): Promise<any[]> {
    const xml = BusyXMLGenerator.fetchPartiesRequest(partyType);
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Master');
  }
  
  /**
   * Fetch all inventory items from Busy
   */
  async getItems(category?: string): Promise<any[]> {
    const xml = BusyXMLGenerator.fetchItemsRequest(category);
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Master');
  }
  
  /**
   * Fetch vouchers from Busy
   */
  async getVouchers(options?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    fromVoucherNumber?: string;
    toVoucherNumber?: string;
  }): Promise<any[]> {
    const xml = BusyXMLGenerator.fetchVouchersRequest(options);
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Voucher');
  }
  
  /**
   * Create a party/ledger in Busy
   */
  async createParty(partyData: Record<string, any>): Promise<any> {
    const xml = BusyXMLGenerator.createPartyRequest(partyData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Create an inventory item in Busy
   */
  async createItem(itemData: Record<string, any>): Promise<any> {
    const xml = BusyXMLGenerator.createItemRequest(itemData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Create a voucher in Busy
   */
  async createVoucher(voucherData: Record<string, any>): Promise<any> {
    const xml = BusyXMLGenerator.createVoucherRequest(voucherData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Send XML request to Busy with retry logic
   */
  private async sendRequest(xml: string): Promise<BusyResponse | null> {
    return this.circuitBreaker.execute(async () => {
      let attempts = 0;
      const maxAttempts = BUSY_CONFIG.connection.retryAttempts;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          this.logger.debug(`Sending request to Busy (attempt ${attempts})`);
          
          const response = await this.client.post(
            '/',
            xml,
            { headers: { 'Content-Type': 'text/xml' } }
          );
          
          const responseText = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);
            
          const parsed = this.parseResponse(responseText);
          
          if (!parsed) {
            throw new Error('Failed to parse Busy response');
          }
          
          // Check for Busy error response
          const status = parsed.RESPONSE?.STATUS;
          if (status === 'FAILURE' || status === 'ERROR') {
            const errorMsg = parsed.RESPONSE?.ERROR || parsed.RESPONSE?.MESSAGE || 'Unknown Busy error';
            throw new Error(`Busy error: ${errorMsg}`);
          }
          
          return parsed;
        } catch (error) {
          const axiosError = error as AxiosError;
          
          if (axiosError.code === 'ECONNREFUSED') {
            throw new Error('Busy is not running or API port is not accessible');
          }
          
          if (axiosError.code === 'ECONNABORTED' || axiosError.timeout) {
            if (attempts >= maxAttempts) {
              throw new Error('Busy API request timed out');
            }
            await this.delay(BUSY_CONFIG.connection.retryDelay * attempts);
          } else {
            // Re-throw other errors immediately
            throw error;
          }
        }
      }
      
      throw new Error('Max retry attempts reached');
    });
  }
  
  /**
   * Parse XML response from Busy
   */
  private parseResponse(xml: string): BusyResponse | null {
    try {
      // Simple XML parsing for Busy response
      const responseMatch = xml.match(/<RESPONSE>([\s\S]*?)<\/RESPONSE>/);
      
      if (!responseMatch) {
        this.logger.warn('Invalid Busy response format - no RESPONSE tag');
        return null;
      }
      
      const responseContent = responseMatch[1];
      
      // Parse status
      const statusMatch = responseContent.match(/<STATUS>(.*?)<\/STATUS>/);
      const errorMatch = responseContent.match(/<ERROR>([\s\S]*?)<\/ERROR>/);
      const messageMatch = responseContent.match(/<MESSAGE>(.*?)<\/MESSAGE>/);
      
      const response: BusyResponse = {
        RESPONSE: {
          STATUS: statusMatch ? statusMatch[1].trim() : 'UNKNOWN',
          ERROR: errorMatch ? errorMatch[1].trim() : undefined,
          MESSAGE: messageMatch ? messageMatch[1].trim() : undefined
        }
      };
      
      // Try to parse data section
      const dataMatch = responseContent.match(/<DATA>([\s\S]*?)<\/DATA>/);
      if (dataMatch) {
        response.RESPONSE!.DATA = dataMatch[1];
      }
      
      return response;
    } catch (error) {
      this.logger.error('Failed to parse Busy response', { error: (error as Error).message });
      return null;
    }
  }
  
  /**
   * Parse company response
   */
  private parseCompanyResponse(response: BusyResponse): any {
    try {
      const data = response.RESPONSE?.DATA;
      if (!data) return null;
      
      // Look for company info in the data
      const nameMatch = data.match(/<CompanyName>(.*?)<\/CompanyName>/i);
      const versionMatch = data.match(/<Version>(.*?)<\/Version>/i);
      
      return {
        companyName: nameMatch ? nameMatch[1].trim() : null,
        version: versionMatch ? versionMatch[1].trim() : null
      };
    } catch (error) {
      this.logger.error('Failed to parse company response', { error: (error as Error).message });
      return null;
    }
  }
  
  /**
   * Parse collection response (parties, items, vouchers)
   */
  private parseCollectionResponse(response: BusyResponse, itemType: string): any[] {
    try {
      const items: any[] = [];
      const data = response.RESPONSE?.DATA;
      
      if (!data) {
        return items;
      }
      
      // Match all items - try different patterns
      let itemRegex;
      
      if (itemType === 'Master') {
        // Match master items with Name attribute or element
        itemRegex = /<Master[^>]*>([\s\S]*?)<\/Master>/g;
      } else if (itemType === 'Voucher') {
        // Match vouchers
        itemRegex = /<Voucher[^>]*>([\s\S]*?)<\/Voucher>/g;
      } else {
        itemRegex = new RegExp(`<${itemType}[\\s\\S]*?>([\\s\\S]*?)</${itemType}>`, 'g');
      }
      
      let match;
      while ((match = itemRegex.exec(data)) !== null) {
        try {
          const itemContent = match[1];
          const item: any = {};
          
          // Extract Name attribute
          const nameAttrMatch = match[0].match(/NAME=["']([^"']+)["']/i);
          if (nameAttrMatch) {
            item.Name = nameAttrMatch[1];
          }
          
          // Extract Name element
          const nameMatch = itemContent.match(/<Name>(.*?)<\/Name>/i);
          if (nameMatch && !item.Name) {
            item.Name = nameMatch[1].trim();
          }
          
          // Extract all other fields
          const fieldRegex = /<(\w+)>(.*?)<\/\1>/g;
          let fieldMatch;
          while ((fieldMatch = fieldRegex.exec(itemContent)) !== null) {
            const [, fieldName, fieldValue] = fieldMatch;
            if (fieldName.toLowerCase() !== 'name') {
              item[fieldName] = fieldValue.trim();
            }
          }
          
          if (item.Name || Object.keys(item).length > 1) {
            items.push(item);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to parse ${itemType} item`, { error: (parseError as Error).message });
        }
      }
      
      return items;
    } catch (error) {
      this.logger.error(`Failed to parse ${itemType} collection`, { error: (error as Error).message });
      return [];
    }
  }
  
  /**
   * Parse import response
   */
  private parseImportResponse(response: BusyResponse): any {
    try {
      const status = response.RESPONSE?.STATUS;
      const error = response.RESPONSE?.ERROR;
      const message = response.RESPONSE?.MESSAGE;
      
      return {
        success: status === 'SUCCESS',
        error: error || message || null,
        message: message || null,
        status: status
      };
    } catch (error) {
      this.logger.error('Failed to parse import response', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BusyConnectorService;
