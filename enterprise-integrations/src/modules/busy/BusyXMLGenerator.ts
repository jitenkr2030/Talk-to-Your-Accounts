import { v4 as uuidv4 } from 'uuid';

/**
 * BusyXMLGenerator
 * 
 * Generates XML requests for Busy Accounting Software API
 * Busy uses XML format similar to Tally but with different structure
 */
export class BusyXMLGenerator {
  
  /**
   * Generate XML header for Busy API requests
   */
  private static generateHeader(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="busy2.xsl"?>`;
  }
  
  /**
   * Generate XML for fetching data from Busy
   */
  static fetchRequest(
    dataType: string,
    params?: Record<string, string>
  ): string {
    const requestId = uuidv4();
    
    let paramsXML = '';
    if (params) {
      paramsXML = Object.entries(params)
        .map(([key, value]) => `        <${key}>${value}</${key}>`)
        .join('\n');
    }
    
    return `${this.generateHeader()}
<REQUEST>
  <REQUESTTYPE>GET</REQUESTTYPE>
  <DATATYPE>${dataType}</DATATYPE>
  <REQUESTID>${requestId}</REQUESTID>
  <PARAMETERS>
${paramsXML}
  </PARAMETERS>
</REQUEST>`.trim();
  }
  
  /**
   * Generate XML for posting data to Busy
   */
  static postRequest(
    dataType: string,
    data: Record<string, any>
  ): string {
    const requestId = uuidv4();
    
    let dataXML = '';
    if (data) {
      dataXML = this.buildDataXML(data, '        ');
    }
    
    return `${this.generateHeader()}
<REQUEST>
  <REQUESTTYPE>POST</REQUESTTYPE>
  <DATATYPE>${dataType}</DATATYPE>
  <REQUESTID>${requestId}</REQUESTID>
  <DATA>
${dataXML}
  </DATA>
</REQUEST>`.trim();
  }
  
  /**
   * Build XML from data object
   */
  private static buildDataXML(data: Record<string, any>, indent: string): string {
    let xml = '';
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object') {
            xml += `${indent}<${key}>\n`;
            xml += this.buildDataXML(item, indent + '  ');
            xml += `${indent}</${key}>\n`;
          } else {
            xml += `${indent}<${key}>${this.escapeXML(String(item))}</${key}>\n`;
          }
        }
      } else if (typeof value === 'object') {
        xml += `${indent}<${key}>\n`;
        xml += this.buildDataXML(value, indent + '  ');
        xml += `${indent}</${key}>\n`;
      } else {
        xml += `${indent}<${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
    }
    
    return xml;
  }
  
  /**
   * Generate XML for fetching parties/ledgers
   */
  static fetchPartiesRequest(partyType?: string): string {
    const params: Record<string, string> = {
      MasterType: 'Account'
    };
    
    if (partyType) {
      params['GroupName'] = partyType;
    }
    
    return this.fetchRequest('MASTERS', params);
  }
  
  /**
   * Generate XML for fetching inventory items
   */
  static fetchItemsRequest(category?: string): string {
    const params: Record<string, string> = {
      MasterType: 'Item'
    };
    
    if (category) {
      params['Category'] = category;
    }
    
    return this.fetchRequest('MASTERS', params);
  }
  
  /**
   * Generate XML for fetching vouchers
   */
  static fetchVouchersRequest(options?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    fromVoucherNumber?: string;
    toVoucherNumber?: string;
  }): string {
    const params: Record<string, string> = {
      VoucherType: options?.voucherType || 'All'
    };
    
    if (options?.fromDate) {
      params['FromDate'] = this.formatDateForBusy(options.fromDate);
    }
    
    if (options?.toDate) {
      params['ToDate'] = this.formatDateForBusy(options.toDate);
    }
    
    if (options?.fromVoucherNumber) {
      params['FromVchNo'] = options.fromVoucherNumber;
    }
    
    if (options?.toVoucherNumber) {
      params['ToVchNo'] = options.toVoucherNumber;
    }
    
    return this.fetchRequest('VOUCHERS', params);
  }
  
  /**
   * Generate XML for creating a party/ledger
   */
  static createPartyRequest(partyData: Record<string, any>): string {
    const data: Record<string, any> = {
      Name: partyData.name,
      GroupName: partyData.type === 'customer' ? 'Sundry Debtors' :
                 partyData.type === 'vendor' ? 'Sundry Creditors' :
                 partyData.parent || 'Miscellaneous Expenses',
      OpeningBalance: partyData.openingBalance || 0,
      OpeningBalanceType: partyData.balanceType || 'Dr'
    };
    
    // Add optional fields
    if (partyData.address) {
      data.Address = partyData.address;
    }
    
    if (partyData.city) {
      data.City = partyData.city;
    }
    
    if (partyData.state) {
      data.State = partyData.state;
    }
    
    if (partyData.pincode) {
      data.PinCode = partyData.pincode;
    }
    
    if (partyData.gstin) {
      data.GSTIN = partyData.gstin;
    }
    
    if (partyData.email) {
      data.Email = partyData.email;
    }
    
    if (partyData.phone) {
      data.Phone = partyData.phone;
    }
    
    return this.postRequest('ACCOUNT', data);
  }
  
  /**
   * Generate XML for creating an inventory item
   */
  static createItemRequest(itemData: Record<string, any>): string {
    const data: Record<string, any> = {
      Name: itemData.name,
      GroupName: itemData.category || 'Primary',
      Unit: itemData.unit || 'NOS',
      OpeningBalance: itemData.openingBalance || 0,
      OpeningBalanceType: 'Dr'
    };
    
    // Add optional fields
    if (itemData.hsnCode) {
      data.HSNCode = itemData.hsnCode;
    }
    
    if (itemData.sacCode) {
      data.SACCode = itemData.sacCode;
    }
    
    if (itemData.rate) {
      data.Rate = itemData.rate;
    }
    
    if (itemData.gstRate) {
      data.GSTRate = itemData.gstRate;
    }
    
    return this.postRequest('ITEM', data);
  }
  
  /**
   * Generate XML for creating a voucher (transaction)
   */
  static createVoucherRequest(voucherData: Record<string, any>): string {
    // Format date to DD/MM/YYYY
    const formatDate = (date: string | Date): string => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Calculate amounts
    const totalAmount = voucherData.totalAmount || voucherData.amount || 0;
    const gstAmount = voucherData.gstAmount || 0;
    const taxableAmount = totalAmount - gstAmount;
    
    // Build voucher lines
    let entriesXML = '';
    
    // Party/Ledger entry
    entriesXML += `
      <LEDGERENTRIES>
        <LEDGERNAME>${voucherData.partyName || voucherData.partyLedger || ''}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${voucherData.voucherType === 'Sales' || voucherData.voucherType === 'Purchase' ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${this.toPaise(totalAmount)}</AMOUNT>
      </LEDGERENTRIES>`;
    
    // Sales/Purchase ledger
    const ledgerName = voucherData.voucherType === 'Sales' ? 'Sales' : 
                       voucherData.voucherType === 'Purchase' ? 'Purchase' : 
                       voucherData.voucherType;
    
    entriesXML += `
      <LEDGERENTRIES>
        <LEDGERNAME>${ledgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${voucherData.voucherType === 'Sales' || voucherData.voucherType === 'Purchase' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>-${this.toPaise(totalAmount)}</AMOUNT>
      </LEDGERENTRIES>`;
    
    // GST entries if applicable
    if (gstAmount > 0) {
      const gstLedger = voucherData.gstType === 'IGST' ? 'Output IGST' : 'Output CGST';
      entriesXML += `
      <LEDGERENTRIES>
        <LEDGERNAME>${gstLedger}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${this.toPaise(gstAmount)}</AMOUNT>
      </LEDGERENTRIES>`;
    }
    
    // Inventory entries if applicable
    if (voucherData.items && voucherData.items.length > 0) {
      for (const item of voucherData.items) {
        entriesXML += `
      <INVENTORYENTRIES>
        <ITEMNAME>${item.name}</ITEMNAME>
        <QUANTITY>${item.quantity || 1}</QUANTITY>
        <RATE>${this.toPaise(item.rate || 0)}</RATE>
        <AMOUNT>${this.toPaise(item.amount || item.rate * (item.quantity || 1))}</AMOUNT>
      </INVENTORYENTRIES>`;
      }
    }
    
    const data: Record<string, any> = {
      VoucherType: this.mapVoucherType(voucherData.voucherType),
      VoucherNumber: voucherData.voucherNumber || '',
      VoucherDate: formatDate(voucherData.date),
      PartyName: voucherData.partyName || '',
      Narration: voucherData.narration || ''
    };
    
    // Build complete data object
    const completeData = {
      ...data,
      LEDGERENTRIES: entriesXML
    };
    
    return this.postRequest('VOUCHER', completeData);
  }
  
  /**
   * Generate XML for company info request
   */
  static fetchCompanyInfoRequest(): string {
    return this.fetchRequest('COMPANYINFO');
  }
  
  /**
   * Generate XML for connection test
   */
  static connectionTestRequest(): string {
    return this.fetchRequest('PING');
  }
  
  /**
   * Generate XML for getting voucher types
   */
  static fetchVoucherTypesRequest(): string {
    return this.fetchRequest('VOUCHERTYPES');
  }
  
  /**
   * Map application voucher type to Busy format
   */
  private static mapVoucherType(voucherType: string): string {
    const typeMap: Record<string, string> = {
      sale: 'Sales',
      sales: 'Sales',
      purchase: 'Purchase',
      payment: 'Payment',
      receipt: 'Receipt',
      journal: 'Journal',
      contra: 'Contra',
      debit_note: 'Debit Note',
      credit_note: 'Credit Note'
    };
    
    return typeMap[voucherType?.toLowerCase()] || voucherType || 'Sales';
  }
  
  /**
   * Format date for Busy API (DD/MM/YYYY)
   */
  private static formatDateForBusy(dateStr: string | Date): string {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Convert amount to paise (integer)
   */
  private static toPaise(amount: number): number {
    return Math.round(amount * 100);
  }
  
  /**
   * Escape special XML characters
   */
  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default BusyXMLGenerator;
