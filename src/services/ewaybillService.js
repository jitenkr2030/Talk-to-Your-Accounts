const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../../data');
const EWAYBILLS_FILE = path.join(DATA_DIR, 'ewaybills.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize ewaybills file if it doesn't exist
if (!fs.existsSync(EWAYBILLS_FILE)) {
  fs.writeFileSync(EWAYBILLS_FILE, JSON.stringify([], null, 2));
}

// Helper functions
const readEwaybills = () => {
  try {
    const data = fs.readFileSync(EWAYBILLS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeEwaybills = (ewaybills) => {
  fs.writeFileSync(EWAYBILLS_FILE, JSON.stringify(ewaybills, null, 2));
};

// GSTIN validation regex
const isValidGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// Vehicle number validation
const isValidVehicleNumber = (vehicleNo) => {
  const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
  return vehicleRegex.test(vehicleNo);
};

// Calculate validity based on distance
const calculateValidity = (distance, isOdc = false) => {
  const daysPerKm = isOdc ? 0.02 : 0.005; // 1 day per 20km for ODC, 1 day per 200km for normal
  const validityDays = Math.ceil(distance * daysPerKm);
  return Math.max(1, Math.min(validityDays, 15)); // Min 1 day, max 15 days (or 30 for ODC)
};

// State code mapping
const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Punjab', '03': 'Chandigarh', '04': 'Himachal Pradesh',
  '05': 'Uttaranchal', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': ' Ladakh'
};

// Check if inter-state
const isInterState = (fromGstin, toGstin) => {
  if (!fromGstin || !toGstin) return false;
  const fromState = fromGstin.substring(0, 2);
  const toState = toGstin.substring(0, 2);
  return fromState !== toState;
};

class EwaybillService {
  // Create new E-Way Bill
  async createEwaybill(ewaybillData) {
    const ewaybills = readEwaybills();
    
    // Validate GSTINs
    if (ewaybillData.consignorGstin && !isValidGSTIN(ewaybillData.consignorGstin)) {
      throw new Error('Invalid Consignor GSTIN format');
    }
    if (ewaybillData.consigneeGstin && !isValidGSTIN(ewaybillData.consigneeGstin)) {
      throw new Error('Invalid Consignee GSTIN format');
    }
    
    // Validate vehicle number if provided
    if (ewaybillData.vehicleNo && !isValidVehicleNumber(ewaybillData.vehicleNo)) {
      throw new Error('Invalid Vehicle Number format. Expected format: MH12AB1234');
    }
    
    // Calculate tax amounts
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    const isInterstate = isInterState(ewaybillData.consignorGstin, ewaybillData.consigneeGstin);
    
    if (ewaybillData.items && ewaybillData.items.length > 0) {
      ewaybillData.items.forEach(item => {
        const taxableValue = parseFloat(item.taxableValue) || 0;
        const taxRate = parseFloat(item.taxRate) || 0;
        
        totalTaxableValue += taxableValue;
        
        if (isInterstate) {
          totalIgst += (taxableValue * taxRate / 100);
        } else {
          totalCgst += (taxableValue * taxRate / 200);
          totalSgst += (taxableValue * taxRate / 200);
        }
      });
    }
    
    // Calculate validity
    const distance = parseInt(ewaybillData.distance) || 0;
    const isOdc = ewaybillData.isOdc === true;
    const validityDays = calculateValidity(distance, isOdc);
    
    const validUpto = new Date();
    validUpto.setDate(validUpto.getDate() + validityDays);
    
    // Generate EWB Number (format: 1600000XXXXX)
    const ewbNumber = `16${String(Date.now()).slice(-11)}`;
    
    const newEwaybill = {
      id: uuidv4(),
      ewbNo: ewbNumber,
      ...ewaybillData,
      totalTaxableValue: totalTaxableValue.toFixed(2),
      totalCgst: totalCgst.toFixed(2),
      totalSgst: totalSgst.toFixed(2),
      totalIgst: totalIgst.toFixed(2),
      totalValue: (totalTaxableValue + totalCgst + totalSgst + totalIgst).toFixed(2),
      isInterstate,
      validityDays,
      validUpto: validUpto.toISOString(),
      status: 'ACTIVE',
      generatedDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    ewaybills.push(newEwaybill);
    writeEwaybills(ewaybills);
    
    return newEwaybill;
  }

  // Get all E-Way Bills
  async getAllEwaybills(filters = {}) {
    let ewaybills = readEwaybills();
    
    // Apply filters
    if (filters.status) {
      ewaybills = ewaybills.filter(ewb => ewb.status === filters.status);
    }
    
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      ewaybills = ewaybills.filter(ewb => new Date(ewb.generatedDate) >= fromDate);
    }
    
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59);
      ewaybills = ewaybills.filter(ewb => new Date(ewb.generatedDate) <= toDate);
    }
    
    // Sort by generated date (newest first)
    ewaybills.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    
    return ewaybills;
  }

  // Get E-Way Bill by ID
  async getEwaybillById(id) {
    const ewaybills = readEwaybills();
    const ewaybill = ewaybills.find(ewb => ewb.id === id);
    
    if (!ewaybill) {
      throw new Error('E-Way Bill not found');
    }
    
    return ewaybill;
  }

  // Get E-Way Bill by EWB Number
  async getEwaybillByNumber(ewbNo) {
    const ewaybills = readEwaybills();
    const ewaybill = ewaybills.find(ewb => ewb.ewbNo === ewbNo);
    
    if (!ewaybill) {
      throw new Error('E-Way Bill not found');
    }
    
    return ewaybill;
  }

  // Update E-Way Bill
  async updateEwaybill(id, updates) {
    const ewaybills = readEwaybills();
    const index = ewaybills.findIndex(ewb => ewb.id === id);
    
    if (index === -1) {
      throw new Error('E-Way Bill not found');
    }
    
    // Validate GSTINs if being updated
    if (updates.consignorGstin && !isValidGSTIN(updates.consignorGstin)) {
      throw new Error('Invalid Consignor GSTIN format');
    }
    if (updates.consigneeGstin && !isValidGSTIN(updates.consigneeGstin)) {
      throw new Error('Invalid Consignee GSTIN format');
    }
    
    // Validate vehicle number if being updated
    if (updates.vehicleNo && !isValidVehicleNumber(updates.vehicleNo)) {
      throw new Error('Invalid Vehicle Number format');
    }
    
    ewaybills[index] = { ...ewaybills[index], ...updates, updatedAt: new Date().toISOString() };
    writeEwaybills(ewaybills);
    
    return ewaybills[index];
  }

  // Cancel E-Way Bill
  async cancelEwaybill(id, reason) {
    const ewaybills = readEwaybills();
    const index = ewaybills.findIndex(ewb => ewb.id === id);
    
    if (index === -1) {
      throw new Error('E-Way Bill not found');
    }
    
    const ewaybill = ewaybills[index];
    
    // Check if already cancelled
    if (ewaybill.status === 'CANCELLED') {
      throw new Error('E-Way Bill is already cancelled');
    }
    
    // Check if can be cancelled (within 24 hours or before transit)
    const generatedDate = new Date(ewaybill.generatedDate);
    const now = new Date();
    const hoursSinceGeneration = (now - generatedDate) / (1000 * 60 * 60);
    
    if (hoursSinceGeneration > 24) {
      throw new Error('E-Way Bill can only be cancelled within 24 hours of generation');
    }
    
    ewaybills[index] = {
      ...ewaybill,
      status: 'CANCELLED',
      cancelReason: reason,
      cancelledDate: new Date().toISOString()
    };
    
    writeEwaybills(ewaybills);
    
    return ewaybills[index];
  }

  // Update vehicle details
  async updateVehicle(id, vehicleData) {
    const ewaybills = readEwaybills();
    const index = ewaybills.findIndex(ewb => ewb.id === id);
    
    if (index === -1) {
      throw new Error('E-Way Bill not found');
    }
    
    const ewaybill = ewaybills[index];
    
    if (ewaybill.status === 'CANCELLED') {
      throw new Error('Cannot update vehicle for cancelled E-Way Bill');
    }
    
    if (vehicleData.vehicleNo && !isValidVehicleNumber(vehicleData.vehicleNo)) {
      throw new Error('Invalid Vehicle Number format');
    }
    
    ewaybills[index] = {
      ...ewaybill,
      ...vehicleData,
      vehicleUpdated: true,
      vehicleUpdatedDate: new Date().toISOString()
    };
    
    writeEwaybills(ewaybills);
    
    return ewaybills[index];
  }

  // Generate JSON for GST Portal
  async generateJson(id) {
    const ewaybills = readEwaybills();
    const ewaybill = ewaybills.find(ewb => ewb.id === id);
    
    if (!ewaybill) {
      throw new Error('E-Way Bill not found');
    }
    
    // Transform to GST Portal EWB-01 JSON format
    const jsonData = {
      ewbVersion: '1.0.0719',
      ewbDate: ewaybill.generatedDate,
      ewbNo: ewaybill.ewbNo,
      isOdc: ewaybill.isOdc || false,
      isMultiVehicle: ewaybill.isMultiVehicle || false,
      
      // Transaction Type Details
      supplyType: ewaybill.supplyType || 'OUTWARD',
      subSupplyType: ewaybill.subSupplyType || 'Supply',
      docType: ewaybill.docType || 'Tax Invoice',
      docNo: ewaybill.docNo || '',
      docDate: ewaybill.docDate || '',
      
      // From Details
      fromGstin: ewaybill.consignorGstin || '',
      fromTrdName: ewaybill.consignorName || '',
      fromAddr1: ewaybill.consignorAddress1 || '',
      fromAddr2: ewaybill.consignorAddress2 || '',
      fromPlace: ewaybill.consignorPlace || '',
      fromPincode: parseInt(ewaybill.consignorPincode) || 0,
      fromState: ewaybill.consignorGstin ? ewaybill.consignorGstin.substring(0, 2) : '',
      
      // To Details
      toGstin: ewaybill.consigneeGstin || '',
      toTrdName: ewaybill.consigneeName || '',
      toAddr1: ewaybill.consigneeAddress1 || '',
      toAddr2: ewaybill.consigneeAddress2 || '',
      toPlace: ewaybill.consigneePlace || '',
      toPincode: parseInt(ewaybill.consigneePincode) || 0,
      toState: ewaybill.consigneeGstin ? ewaybill.consigneeGstin.substring(0, 2) : '',
      
      // Item Details
      itemList: ewaybill.items ? ewaybill.items.map((item, idx) => ({
        itemNo: idx + 1,
        productName: item.productName || '',
        productDesc: item.productDesc || '',
        hsnCode: item.hsnCode || '',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || 'NOS',
        taxableValue: parseFloat(item.taxableValue) || 0,
        igstRate: parseFloat(item.taxRate) || 0,
        cgstRate: ewaybill.isInterstate ? 0 : parseFloat(item.taxRate) / 2,
        sgstRate: ewaybill.isInterstate ? 0 : parseFloat(item.taxRate) / 2,
        cessRate: parseFloat(item.cessRate) || 0,
        cessAdvol: parseFloat(item.cessAdvol) || 0
      })) : [],
      
      // Total Values
      totalValue: parseFloat(ewaybill.totalValue) || 0,
      cgstValue: parseFloat(ewaybill.totalCgst) || 0,
      sgstValue: parseFloat(ewaybill.totalSgst) || 0,
      igstValue: parseFloat(ewaybill.totalIgst) || 0,
      cessValue: parseFloat(ewaybill.cessValue) || 0,
      
      // Transporter Details
      transporterId: ewaybill.transporterId || '',
      transporterName: ewaybill.transporterName || '',
      transporterDocNo: ewaybill.transporterDocNo || '',
      transporterDocDate: ewaybill.transporterDocDate || '',
      
      // Vehicle Details
      mode: ewaybill.mode || 'Road',
      vehicleNo: ewaybill.vehicleNo || '',
      fromPlace: ewaybill.dispatchPlace || '',
      fromState: ewaybill.dispatchState || '',
      toPlace: ewaybill.shipToPlace || '',
      toState: ewaybill.shipToState || '',
      travelDistance: parseInt(ewaybill.distance) || 0,
      
      // Validity
      validUpto: ewaybill.validUpto,
      extendedDate: ewaybill.extendedDate || '',
      
      // Status
      status: ewaybill.status,
      cancelDate: ewaybill.cancelledDate || '',
      cancelRsnCode: ewaybill.cancelRsnCode || '',
      cancelRmrk: ewaybill.cancelReason || ''
    };
    
    return jsonData;
  }

  // Get dashboard statistics
  async getDashboardStats() {
    const ewaybills = readEwaybills();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
      total: ewaybills.length,
      active: ewaybills.filter(ewb => ewb.status === 'ACTIVE').length,
      cancelled: ewaybills.filter(ewb => ewb.status === 'CANCELLED').length,
      expired: ewaybills.filter(ewb => new Date(ewb.validUpto) < now && ewb.status === 'ACTIVE').length,
      generatedToday: ewaybills.filter(ewb => new Date(ewb.generatedDate) >= today).length,
      expiringSoon: ewaybills.filter(ewb => {
        const validUpto = new Date(ewb.validUpto);
        const daysUntilExpiry = Math.ceil((validUpto - now) / (1000 * 60 * 60 * 24));
        return ewb.status === 'ACTIVE' && daysUntilExpiry > 0 && daysUntilExpiry <= 3;
      }).length
    };
    
    return stats;
  }

  // Get HSN codes list (common ones)
  getHsnCodes() {
    return [
      { code: '0101', description: 'Live horses, asses, mules and hinnies' },
      { code: '0201', description: 'Meat of bovine animals, fresh or chilled' },
      { code: '0401', description: 'Milk and cream, not concentrated' },
      { code: '1001', description: 'Wheat and meslin' },
      { code: '1701', description: 'Cane or beet sugar' },
      { code: '2401', description: 'Unmanufactured tobacco' },
      { code: '3001', description: 'Dried glands, extracts for organo-therapeutic' },
      { code: '3002', description: 'Human blood; antisera, vaccines' },
      { code: '3003', description: 'Medicaments, not in measured doses' },
      { code: '3004', description: 'Medicaments in measured doses' },
      { code: '3304', description: 'Beauty or make-up preparations' },
      { code: '4202', description: 'Trunks, suit-cases, handbags' },
      { code: '5208', description: 'Woven fabrics of cotton' },
      { code: '6101', description: "Men's overcoats, jackets of knitted fabrics" },
      { code: '6102', description: "Women's overcoats, jackets of knitted fabrics" },
      { code: '6201', description: "Men's overcoats, jackets, cloaks" },
      { code: '6202', description: "Women's overcoats, jackets, cloaks" },
      { code: '6204', description: "Women's suits, dresses, skirts" },
      { code: '6401', description: 'Waterproof footwear' },
      { code: '6402', description: 'Footwear with outer soles of rubber' },
      { code: '7117', description: 'Imitation jewellery' },
      { code: '8415', description: 'Air conditioning machines' },
      { code: '8418', description: 'Refrigerators, freezers' },
      { code: '8471', description: 'Automatic data processing machines' },
      { code: '8507', description: 'Electric accumulators' },
      { code: '8517', description: 'Telephone sets, smartphones' },
      { code: '8702', description: 'Motor vehicles for transport of persons' },
      { code: '8703', description: 'Motor cars and vehicles for transport' },
      { code: '8704', description: 'Motor vehicles for goods transport' },
      { code: '9401', description: 'Seats, whether or not convertible' },
      { code: '9403', description: 'Furniture and parts thereof' },
      { code: '9405', description: 'Lamps and lighting fittings' }
    ];
  }

  // Get state codes
  getStateCodes() {
    return Object.entries(STATE_CODES).map(([code, name]) => ({
      code,
      name
    }));
  }
}

module.exports = new EwaybillService();
