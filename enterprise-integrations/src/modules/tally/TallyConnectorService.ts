import axios, { AxiosInstance, AxiosError } from 'axios';
import { TALLY_CONFIG } from './TallyConfig';
import { TallyXMLGenerator } from './TallyXMLGenerator';
import { CircuitBreakerService } from '../../core/resilience/CircuitBreakerService';
import { LoggerService } from '../../core/logging/LoggerService';

interface TallyResponse {
  HEADER: {
    VERSION?: string;
    TALLYREQUEST?: string;
    STATUS?: string;
  };
  BODY?: {
    DATA?: string;
    DESC?: string;
    LINEERROR?: string;
  };
}

interface TallyConnectionStatus {
  isConnected: boolean;
  companyName?: string;
  error?: string;
}

/**
 * TallyConnectorService
 * 
 * Handles HTTP communication with Tally Prime API
 * Implements connection pooling, retry logic, and circuit breaker
 */
export class TallyConnectorService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreakerService;
  private logger: LoggerService;
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = `http://${TALLY_CONFIG.connection.host}:${TALLY_CONFIG.connection.port}`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: TALLY_CONFIG.connection.timeout,
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'application/xml'
      }
    });
    
    this.circuitBreaker = new CircuitBreakerService({
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3
    });
    
    this.logger = new LoggerService('TallyConnector');
  }
  
  /**
   * Check if Tally is running and accessible
   */
  async checkConnection(): Promise<TallyConnectionStatus> {
    try {
      const response = await this.sendRequest(TallyXMLGenerator.fetchCompanyRequest());
      const companyInfo = this.parseCompanyResponse(response);
      
      return {
        isConnected: true,
        companyName: companyInfo?.name || 'Unknown Company'
      };
    } catch (error: any) {
      this.logger.error('Tally connection check failed', { error: error.message });
      return {
        isConnected: false,
        error: error.message || 'Unable to connect to Tally'
      };
    }
  }
  
  /**
   * Fetch company information from Tally
   */
  async getCompanyInfo(): Promise<any> {
    const xml = TallyXMLGenerator.fetchCompanyRequest();
    const response = await this.sendRequest(xml);
    return this.parseCompanyResponse(response);
  }
  
  /**
   * Fetch all parties/ledgers from Tally
   */
  async getParties(): Promise<any[]> {
    const xml = TallyXMLGenerator.fetchPartiesRequest();
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Ledger');
  }
  
  /**
   * Fetch all inventory items from Tally
   */
  async getItems(): Promise<any[]> {
    const xml = TallyXMLGenerator.fetchItemsRequest();
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'StockItem');
  }
  
  /**
   * Fetch vouchers from Tally
   */
  async getVouchers(fromDate?: string, toDate?: string): Promise<any[]> {
    const xml = TallyXMLGenerator.fetchVouchersRequest(fromDate, toDate);
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Voucher');
  }
  
  /**
   * Create a master record in Tally
   */
  async createMaster(masterType: string, data: Record<string, any>): Promise<any> {
    const xml = TallyXMLGenerator.createMasterRequest(masterType, data);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Create a party ledger in Tally
   */
  async createParty(partyData: Record<string, any>): Promise<any> {
    const xml = TallyXMLGenerator.createPartyRequest(partyData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Create an inventory item in Tally
   */
  async createItem(itemData: Record<string, any>): Promise<any> {
    const xml = TallyXMLGenerator.createItemRequest(itemData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Create a voucher in Tally
   */
  async createVoucher(voucherData: Record<string, any>): Promise<any> {
    const xml = TallyXMLGenerator.createVoucherRequest(voucherData);
    const response = await this.sendRequest(xml);
    return this.parseImportResponse(response);
  }
  
  /**
   * Send XML request to Tally with retry logic
   */
  private async sendRequest(xml: string): Promise<TallyResponse | null> {
    return this.circuitBreaker.execute(async () => {
      let attempts = 0;
      const maxAttempts = TALLY_CONFIG.connection.retryAttempts;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          this.logger.debug(`Sending request to Tally (attempt ${attempts})`);
          
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
            throw new Error('Failed to parse Tally response');
          }
          
          // Check for Tally error response
          if (parsed.HEADER?.STATUS === '0') {
            const errorMsg = parsed.BODY?.LINEERROR || parsed.BODY?.DESC || 'Unknown Tally error';
            throw new Error(`Tally error: ${errorMsg}`);
          }
          
          return parsed;
        } catch (error) {
          const axiosError = error as AxiosError;
          
          if (axiosError.code === 'ECONNREFUSED') {
            throw new Error('Tally is not running or API port is not accessible');
          }
          
          if (axiosError.code === 'ECONNABORTED' || axiosError.timeout) {
            if (attempts >= maxAttempts) {
              throw new Error('Tally API request timed out');
            }
            await this.delay(TALLY_CONFIG.connection.retryDelay * attempts);
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
   * Parse XML response from Tally
   */
  private parseResponse(xml: string): TallyResponse | null {
    try {
      // Simple XML parsing for Tally response
      const headerMatch = xml.match(/<HEADER>([\s\S]*?)<\/HEADER>/);
      const bodyMatch = xml.match(/<BODY>([\s\S]*?)<\/BODY>/);
      
      if (!headerMatch || !bodyMatch) {
        this.logger.warn('Invalid Tally response format');
        return null;
      }
      
      // Parse header
      const header: any = {};
      const versionMatch = headerMatch[1].match(/<VERSION>(.*?)<\/VERSION>/);
      const requestMatch = headerMatch[1].match(/<TALLYREQUEST>(.*?)<\/TALLYREQUEST>/);
      const statusMatch = headerMatch[1].match(/<STATUS>(.*?)<\/STATUS>/);
      
      if (versionMatch) header.VERSION = versionMatch[1];
      if (requestMatch) header.TALLYREQUEST = requestMatch[1];
      if (statusMatch) header.STATUS = statusMatch[1];
      
      // Parse body
      const body: any = {};
      const dataMatch = bodyMatch[1].match(/<DATA>([\s\S]*?)<\/DATA>/);
      const descMatch = bodyMatch[1].match(/<DESC>([\s\S]*?)<\/DESC>/);
      const lineErrorMatch = bodyMatch[1].match(/<LINEERROR>(.*?)<\/LINEERROR>/);
      
      if (dataMatch) body.DATA = dataMatch[1];
      if (descMatch) body.DESC = descMatch[1];
      if (lineErrorMatch) body.LINEERROR = lineErrorMatch[1];
      
      return { HEADER: header, BODY: body };
    } catch (error) {
      this.logger.error('Failed to parse Tally response', { error: (error as Error).message });
      return null;
    }
  }
  
  /**
   * Parse company response
   */
  private parseCompanyResponse(response: TallyResponse): any {
    try {
      const dataMatch = response.BODY?.DATA?.match(/<COMPANY>([\s\S]*?)<\/COMPANY>/);
      if (dataMatch) {
        const companyMatch = dataMatch[1].match(/<NAME>(.*?)<\/NAME>/);
        return {
          name: companyMatch ? companyMatch[1] : null,
          fullData: dataMatch[1]
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to parse company response', { error: (error as Error).message });
      return null;
    }
  }
  
  /**
   * Parse collection response (parties, items, vouchers)
   */
  private parseCollectionResponse(response: TallyResponse, collectionType: string): any[] {
    try {
      const items: any[] = [];
      const dataMatch = response.BODY?.DATA;
      
      if (!dataMatch) {
        return items;
      }
      
      // Match all collection items
      const itemRegex = new RegExp(
        `<${collectionType}[\\s\\S]*?NAME="([^"]*)"([\\s\\S]*?)</${collectionType}>`,
        'g'
      );
      
      let match;
      while ((match = itemRegex.exec(dataMatch)) !== null) {
        const item: any = { Name: match[1] };
        const fieldsMatch = match[2].matchAll(/<(\w+)>([^<]*)<\/(\w+)>/g);
        
        for (const field of fieldsMatch) {
          const [, fieldName, fieldValue] = field;
          if (fieldName && fieldValue !== undefined) {
            item[fieldName] = fieldValue.trim();
          }
        }
        
        items.push(item);
      }
      
      return items;
    } catch (error) {
      this.logger.error(`Failed to parse ${collectionType} collection`, { error: (error as Error).message });
      return [];
    }
  }
  
  /**
   * Parse import response
   */
  private parseImportResponse(response: TallyResponse): any {
    try {
      const status = response.HEADER?.STATUS;
      const lineError = response.BODY?.LINEERROR;
      
      return {
        success: status === '1',
        error: lineError || null,
        importedCount: status === '1' ? 1 : 0
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

export default TallyConnectorService;
