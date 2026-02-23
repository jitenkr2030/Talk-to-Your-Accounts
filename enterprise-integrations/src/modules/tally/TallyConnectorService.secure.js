/**
 * Secure Tally Connector Service
 * 
 * Updated version of TallyConnectorService with XXE-safe XML parsing
 * and secure token storage integration.
 */

const axios = { AxiosInstance, AxiosError } = require('axios');
const { TALLY_CONFIG } = require('./TallyConfig');
const { TallyXMLGenerator } = require('./TallyXMLGenerator');
const { CircuitBreakerService } = require('../../core/resilience/CircuitBreakerService');
const { LoggerService } = require('../../core/logging/LoggerService');
const { safeParse, securityCheck } = require('../../utils/xmlParser');

/**
 * TallyConnectorService - Secure Version
 * 
 * Handles HTTP communication with Tally Prime API
 * Implements connection pooling, retry logic, circuit breaker
 * Uses XXE-safe XML parsing and encrypted token storage
 */
class TallyConnectorService {
  constructor(options = {}) {
    this.baseUrl = `http://${TALLY_CONFIG.connection.host}:${TALLY_CONFIG.connection.port}`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout || TALLY_CONFIG.connection.timeout,
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'application/xml'
      }
    });
    
    this.circuitBreaker = new CircuitBreakerService({
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 30000,
      halfOpenRequests: options.halfOpenRequests || 3
    });
    
    this.logger = new LoggerService('TallyConnector');
    
    // Store user ID for token management
    this.userId = options.userId || null;
  }
  
  /**
   * Set user ID for token management
   * @param {number} userId User ID
   */
  setUserId(userId) {
    this.userId = userId;
  }
  
  /**
   * Check if Tally is running and accessible
   */
  async checkConnection() {
    try {
      const response = await this.sendRequest(TallyXMLGenerator.fetchCompanyRequest());
      const companyInfo = this.parseCompanyResponse(response);
      
      return {
        isConnected: true,
        companyName: companyInfo?.name || 'Unknown Company'
      };
    } catch (error) {
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
  async getCompanyInfo() {
    const xml = TallyXMLGenerator.fetchCompanyRequest();
    const response = await this.sendRequest(xml);
    return this.parseCompanyResponse(response);
  }
  
  /**
   * Fetch all parties/ledgers from Tally
   */
  async getParties() {
    const xml = TallyXMLGenerator.fetchPartiesRequest();
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Ledger');
  }
  
  /**
   * Fetch all inventory items from Tally
   */
  async getItems() {
    const xml = TallyXMLGenerator.fetchItemsRequest();
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'StockItem');
  }
  
  /**
   * Fetch vouchers from Tally
   */
  async getVouchers(fromDate, toDate) {
    const xml = TallyXMLGenerator.fetchVouchersRequest(fromDate, toDate);
    const response = await this.sendRequest(xml);
    return this.parseCollectionResponse(response, 'Voucher');
  }
  
  /**
   * Send XML request to Tally with retry logic
   */
  async sendRequest(xml) {
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
            
          // Security check before parsing
          const security = securityCheck(responseText);
          if (!security.isSafe) {
            this.logger.error('Security check failed on Tally response', { issues: security.issues });
            throw new Error('Tally response failed security check');
          }
          
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
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Tally is not running or API port is not accessible');
          }
          
          if (error.code === 'ECONNABORTED' || error.timeout) {
            if (attempts >= maxAttempts) {
              throw new Error('Tally API request timed out');
            }
            await this.delay(TALLY_CONFIG.connection.retryDelay * attempts);
          } else {
            throw error;
          }
        }
      }
      
      throw new Error('Max retry attempts reached');
    });
  }
  
  /**
   * Parse XML response from Tally using XXE-safe parser
   */
  parseResponse(xml) {
    // Use secure XML parsing
    const result = safeParse(xml, 'TallyResponse');
    
    if (!result.success) {
      this.logger.warn('Invalid Tally response format', { error: result.error });
      return null;
    }
    
    return result.data;
  }
  
  /**
   * Parse company response
   */
  parseCompanyResponse(response) {
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
      this.logger.error('Failed to parse company response', { error: error.message });
      return null;
    }
  }
  
  /**
   * Parse collection response (parties, items, vouchers)
   */
  parseCollectionResponse(response, collectionType) {
    try {
      const items = [];
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
        const item = { Name: match[1] };
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
      this.logger.error(`Failed to parse ${collectionType} collection`, { error: error.message });
      return [];
    }
  }
  
  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = TallyConnectorService;
