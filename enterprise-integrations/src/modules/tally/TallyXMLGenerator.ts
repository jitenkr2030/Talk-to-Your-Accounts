import { v4 as uuidv4 } from 'uuid';

/**
 * TallyXMLGenerator
 * 
 * Generates XML requests for Tally Prime API
 * Tally uses a specific XML schema with nested elements
 */
export class TallyXMLGenerator {
  
  /**
   * Generate XML for fetching data from Tally
   */
  static fetchRequest(
    collection: string,
    filters?: Record<string, string>,
    fields?: string[]
  ): string {
    let filterXML = '';
    if (filters) {
      filterXML = Object.entries(filters)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join('');
    }
    
    let fieldsXML = '';
    if (fields) {
      fieldsXML = fields.map(f => `<${f}/>`).join('');
    }
    
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <ID>${collection}</ID>
        </HEADER>
        <BODY>
          <DESC>
            <STDFILTER>${filterXML}</STDFILTER>
            <EXPORTFORMAT>
              <FDOFORMAT>XML</FDOFORMAT>
            </EXPORTFORMAT>
          </DESC>
        </BODY>
      </ENVELOPE>
    `.trim();
  }
  
  /**
   * Generate XML for creating a master record (Party, Item, etc.)
   */
  static createMasterRequest(
    masterType: string,
    data: Record<string, any>
  ): string {
    let masterFields = '';
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        masterFields += `<${key}>${this.escapeXML(String(value))}</${key}>`;
      }
    }
    
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Import</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <SUBTYPE>${masterType}</SUBTYPE>
          <ID>${masterType} Masters</ID>
        </HEADER>
        <BODY>
          <DESC>
            <IMPORTDATA>
              <REQUESTDESC>
                <STDFILTER></STDFILTER>
              </REQUESTDESC>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <${masterType} NAME="${data.Name || data.name || ''}" ACTION="Create">
                    ${masterFields}
                  </${masterType}>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </DESC>
        </BODY>
      </ENVELOPE>
    `.trim();
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
    
    // Calculate amounts in paise (Tally uses paise as base unit)
    const toPaise = (amount: number): number => Math.round(amount * 100);
    
    // Build voucher lines
    let allLedgerEntries = '';
    
    // Main party ledger entry
    if (voucherData.partyName || voucherData.partyLedger) {
      allLedgerEntries += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${voucherData.partyName || voucherData.partyLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${voucherData.voucherType === 'Sales' || voucherData.voucherType === 'Purchase' ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${toPaise(voucherData.totalAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }
    
    // Sales/Purchase ledger entry
    const ledgerName = voucherData.voucherType === 'Sales' ? 'Sales' : 
                       voucherData.voucherType === 'Purchase' ? 'Purchase' : 
                       voucherData.voucherType;
    
    allLedgerEntries += `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${ledgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${voucherData.voucherType === 'Sales' || voucherData.voucherType === 'Purchase' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>-${toPaise(voucherData.totalAmount)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
    `;
    
    // GST entries if applicable
    if (voucherData.gstAmount && voucherData.gstAmount > 0) {
      const gstLedger = voucherData.gstType === 'IGST' ? 'Output IGST' : 'Output CGST';
      allLedgerEntries += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${gstLedger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${toPaise(voucherData.gstAmount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }
    
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Import</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <SUBTYPE>Voucher</SUBTYPE>
          <ID>Vouchers</ID>
        </HEADER>
        <BODY>
          <DESC>
            <IMPORTDATA>
              <REQUESTDESC>
                <STDFILTER></STDFILTER>
              </REQUESTDESC>
              <REQUESTDATA>
                <TALLYMESSAGE>
                  <VOUCHER NAME="${voucherData.voucherNumber || ''}" 
                           VOUCHERTYPE="${voucherData.voucherType}" 
                           VOUCHERDATE="${formatDate(voucherData.date)}" 
                           ACTION="Create">
                    <GUID>${uuidv4()}</GUID>
                    <PARTYNAME>${voucherData.partyName || ''}</PARTYNAME>
                    <NARRATION>${voucherData.narration || ''}</NARRATION>
                    ${allLedgerEntries}
                  </VOUCHER>
                </TALLYMESSAGE>
              </REQUESTDATA>
            </IMPORTDATA>
          </DESC>
        </BODY>
      </ENVELOPE>
    `.trim();
  }
  
  /**
   * Generate XML for company data fetch
   */
  static fetchCompanyRequest(): string {
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <ID>Company</ID>
        </HEADER>
        <BODY>
          <DESC>
            <EXPORTFORMAT>
              <FDOFORMAT>XML</FDOFORMAT>
            </EXPORTFORMAT>
          </DESC>
        </BODY>
      </ENVELOPE>
    `.trim();
  }
  
  /**
   * Generate XML for fetching parties/ledgers
   */
  static fetchPartiesRequest(): string {
    return this.fetchRequest('Ledger', undefined, [
      'Name',
      'Parent',
      'OpeningBalance',
      'Address',
      'State',
      'Pincode',
      'GSTIN',
      'Email',
      'Phone'
    ]);
  }
  
  /**
   * Generate XML for fetching inventory items
   */
  static fetchItemsRequest(): string {
    return this.fetchRequest('StockItem', undefined, [
      'Name',
      'Parent',
      'OpeningBalance',
      'RateOfDecrement',
      'Unit',
      'Godown'
    ]);
  }
  
  /**
   * Generate XML for fetching vouchers
   */
  static fetchVouchersRequest(fromDate?: string, toDate?: string): string {
    const filters: Record<string, string> = {};
    if (fromDate) {
      filters['DATE'] = fromDate;
    }
    
    return this.fetchRequest('Voucher', filters, [
      'Date',
      'VoucherNumber',
      'VoucherType',
      'PartyName',
      'LedgerName',
      'Amount',
      'Narration'
    ]);
  }
  
  /**
   * Generate XML for creating/modifying a party ledger
   */
  static createPartyRequest(partyData: Record<string, any>): string {
    const ledgerData: Record<string, any> = {
      Name: partyData.name,
      Parent: partyData.type === 'customer' ? 'Sundry Debtors' : 
              partyData.type === 'vendor' ? 'Sundry Creditors' : 
              partyData.parent || '',
      OpeningBalance: partyData.openingBalance || 0,
      Address: partyData.address || '',
      State: partyData.state || '',
      Pincode: partyData.pincode || '',
      GSTIN: partyData.gstin || '',
      Email: partyData.email || '',
      Phone: partyData.phone || ''
    };
    
    return this.createMasterRequest('Ledger', ledgerData);
  }
  
  /**
   * Generate XML for creating an inventory item
   */
  static createItemRequest(itemData: Record<string, any>): string {
    const itemRecordData: Record<string, any> = {
      Name: itemData.name,
      Parent: itemData.category || 'Primary',
      Unit: itemData.unit || 'PCS',
      RateOfDecrement: itemData.rate || 0
    };
    
    return this.createMasterRequest('StockItem', itemRecordData);
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

export default TallyXMLGenerator;
