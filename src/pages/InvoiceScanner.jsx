import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  Loader,
  ChevronRight,
  Trash2,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Download
} from 'lucide-react';
import useAppStore from '../stores/appStore';

const InvoiceScanner = ({ onNavigate }) => {
  const {
    addMessage,
    currentUser,
    loadTransactions,
    parties,
    products
  } = useAppStore();

  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'upload'
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle', 'capturing', 'processing', 'review', 'complete'
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const [scannedInvoices, setScannedInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraStartedRef = useRef(false);

  // Load scanned invoices and start camera on mount
  useEffect(() => {
    loadScannedInvoices();
    
    // Start camera after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!cameraStartedRef.current) {
        startCamera();
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start camera preview
  const startCamera = async () => {
    try {
      // Check if camera is already running
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        if (tracks.some(t => t.readyState === 'live')) {
          setScanStatus('idle');
          setError(null);
          return;
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        cameraStartedRef.current = true;
        setScanStatus('idle');
        setError(null);
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        };
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions or use upload mode.');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not available. Please refresh and try again.');
      return;
    }
    
    const video = videoRef.current;
    
    // Check if video stream is active
    if (!video.srcObject || !video.srcObject.active) {
      // Try to restart camera
      startCamera();
      setError('Camera stream was interrupted. Restarting...');
      return;
    }
    
    // Check if video has valid dimensions and is playing
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      // Wait for video to be ready
      const checkVideoReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          performCapture();
        } else {
          setTimeout(checkVideoReady, 100);
        }
      };
      checkVideoReady();
      return;
    }
    
    performCapture();
  };

  // Perform the actual capture
  const performCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Validate the data URL
    if (!dataUrl || dataUrl.length < 100 || !dataUrl.startsWith('data:image/')) {
      setError('Failed to capture image. Please try again.');
      return;
    }
    
    setCapturedImage(dataUrl);
    setScanStatus('processing');
    
    // Stop camera after capture
    stopCamera();
    
    // Process the image
    processImage(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPEG, PNG)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        
        // Validate the data URL
        if (!result || result.length < 100 || !result.startsWith('data:image/')) {
          setError('Failed to read image file. Please try a different file.');
          return;
        }
        
        setCapturedImage(result);
        setScanMode('upload');
        setScanStatus('processing');
        processImage(result);
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Process the captured/uploaded image
  const processImage = async (imageData) => {
    try {
      setError(null);
      
      // Validate input
      if (!imageData || typeof imageData !== 'string') {
        setError('Invalid image data. Please try again.');
        setScanStatus('idle');
        return;
      }
      
      // Validate data URL format
      if (!imageData.startsWith('data:image/') || imageData.length < 100) {
        setError('Invalid image format. Please capture or upload a valid image.');
        setScanStatus('idle');
        return;
      }
      
      // Process with IPC-based OCR service
      const result = await window.api.invoiceScanning.processOCR(imageData);
      
      if (result.success) {
        setScannedData(result);
        setScanStatus('review');
      } else {
        setError(result.error || 'Failed to process invoice. Please try again.');
        setScanStatus('idle');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process invoice. Please try again with a clearer image.');
      setScanStatus('idle');
    }
  };

  // Load scanned invoices from database
  const loadScannedInvoices = async () => {
    try {
      const result = await window.api.invoiceScanning.getInvoices({});
      if (result.success) {
        setScannedInvoices(result.invoices || []);
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  };

  // Save scanned invoice to database
  const saveInvoice = async () => {
    try {
      const result = await window.api.invoiceScanning.saveInvoice(scannedData);
      if (result.success) {
        setScanStatus('complete');
        addMessage('assistant', 'Invoice scanned and saved successfully!');
        loadScannedInvoices();
        
        // Reset for next scan
        setTimeout(() => {
          setCapturedImage(null);
          setScannedData(null);
          setScanStatus('idle');
          startCamera();
        }, 2000);
      } else {
        setError(result.error || 'Failed to save invoice');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save invoice');
    }
  };

  // Import scanned invoice to transactions
  const importToTransactions = async (invoiceId) => {
    try {
      const result = await window.api.invoiceScanning.importToTransactions(invoiceId);
      if (result.success) {
        addMessage('assistant', `Successfully imported ${result.transactionCount} transactions!`);
        loadTransactions({ limit: 5 });
        loadScannedInvoices();
      } else {
        setError(result.error || 'Failed to import transactions');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import transactions');
    }
  };

  // Delete scanned invoice
  const deleteInvoice = async (invoiceId) => {
    try {
      const result = await window.api.invoiceScanning.deleteInvoice(invoiceId);
      if (result.success) {
        loadScannedInvoices();
        addMessage('assistant', 'Invoice deleted');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Update scanned data
  const updateLineItem = (index, field, value) => {
    const updatedLines = [...scannedData.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setScannedData({ ...scannedData, lines: updatedLines });
  };

  // Update header data
  const updateHeaderData = (field, value) => {
    setScannedData({
      ...scannedData,
      header: { ...scannedData.header, [field]: value }
    });
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setScannedData(null);
    setError(null);
    startCamera();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-emerald-500';
    if (confidence >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  // Render camera view
  const renderCameraView = () => (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Overlay guides */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4/5 h-3/4 border-2 border-white/30 rounded-lg">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              Position invoice within frame
            </div>
          </div>
        </div>
        
        {/* Capture button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <button
            onClick={captureImage}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Camera size={32} className="text-slate-800" />
          </button>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Mode toggle */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setScanMode('camera')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            scanMode === 'camera' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          <Camera size={18} /> Camera
        </button>
        <button
          onClick={() => {
            stopCamera();
            fileInputRef.current?.click();
          }}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            scanMode === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          <Upload size={18} /> Upload
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );

  // Render processing view
  const renderProcessingView = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader size={48} className="animate-spin text-emerald-500 mb-4" />
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Processing Invoice</h3>
      <p className="text-slate-500">Extracting data from your invoice...</p>
      <div className="mt-8 w-full max-w-md bg-slate-200 rounded-full h-2">
        <div className="bg-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );

  // Render review view
  const renderReviewView = () => (
    <div className="max-w-4xl mx-auto">
      {/* Image preview */}
      <div className="mb-6">
        <img
          src={capturedImage}
          alt="Scanned Invoice"
          className="w-full rounded-xl shadow-lg"
        />
      </div>

      {/* Confidence indicator */}
      <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${
        scannedData.confidence >= 80 ? 'bg-emerald-50' :
        scannedData.confidence >= 60 ? 'bg-amber-50' : 'bg-red-50'
      }`}>
        <AlertCircle size={20} className={getConfidenceColor(scannedData.confidence)} />
        <span className={`font-medium ${getConfidenceColor(scannedData.confidence)}`}>
          OCR Confidence: {scannedData.confidence.toFixed(0)}%
        </span>
        <span className="text-slate-500 text-sm ml-auto">
          Please review all extracted data carefully
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header data form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Invoice Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-1">Invoice Number *</label>
            <input
              type="text"
              value={scannedData.header.invoice_number || ''}
              onChange={(e) => updateHeaderData('invoice_number', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              placeholder="INV-001"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">Date *</label>
            <input
              type="date"
              value={scannedData.header.invoice_date || ''}
              onChange={(e) => updateHeaderData('invoice_date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">Vendor Name</label>
            <input
              type="text"
              value={scannedData.header.vendor_name || ''}
              onChange={(e) => updateHeaderData('vendor_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              placeholder="ABC Suppliers"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">Total Amount *</label>
            <input
              type="number"
              value={scannedData.header.total_amount || ''}
              onChange={(e) => updateHeaderData('total_amount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Line Items</h3>
          <span className="text-sm text-slate-500">{scannedData.lines.length} items</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Description</th>
                <th className="pb-3 pr-4">Qty</th>
                <th className="pb-3 pr-4">Rate</th>
                <th className="pb-3 pr-4">GST %</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {scannedData.lines.map((line, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-500">{index + 1}</td>
                  <td className="py-3 pr-4">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      value={line.rate}
                      onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={line.gst_rate}
                      onChange={(e) => updateLineItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatCurrency(line.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(scannedData.header.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST:</span>
              <span>{formatCurrency(scannedData.header.total_gst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t border-slate-200 pt-2">
              <span>Total:</span>
              <span>{formatCurrency(scannedData.header.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <button
          onClick={retakePhoto}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 flex items-center gap-2"
        >
          <RefreshCw size={20} /> Retake
        </button>
        <button
          onClick={saveInvoice}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-2"
        >
          <Check size={20} /> Save Invoice
        </button>
      </div>
    </div>
  );

  // Render complete view
  const renderCompleteView = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <Check size={40} className="text-emerald-500" />
      </div>
      <h3 className="text-2xl font-semibold text-slate-800 mb-2">Invoice Saved!</h3>
      <p className="text-slate-500 mb-6">The invoice has been scanned and saved successfully.</p>
      <div className="flex gap-4">
        <button
          onClick={() => {
            setCapturedImage(null);
            setScannedData(null);
            setScanStatus('idle');
            startCamera();
          }}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-2"
        >
          <Camera size={20} /> Scan Another
        </button>
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 flex items-center gap-2"
        >
          <ChevronRight size={20} /> Go to Dashboard
        </button>
      </div>
    </div>
  );

  // Render history view
  const renderHistoryView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Scanned Invoices</h2>
        <button
          onClick={() => setShowHistory(false)}
          className="px-4 py-2 text-slate-600 hover:text-slate-800"
        >
          Back to Scanner
        </button>
      </div>

      {scannedInvoices.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No scanned invoices yet</p>
          <p className="text-sm text-slate-400 mt-1">Start by scanning your first invoice</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scannedInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{invoice.invoice_number}</h3>
                  <p className="text-sm text-slate-500">{invoice.vendor_name || 'Unknown Vendor'}</p>
                  <p className="text-sm text-slate-400">{invoice.invoice_date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{formatCurrency(invoice.total_amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    invoice.status === 'imported' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                {invoice.status !== 'imported' && (
                  <button
                    onClick={() => importToTransactions(invoice.id)}
                    className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center gap-1"
                  >
                    <Download size={14} /> Import
                  </button>
                )}
                <button
                  onClick={() => deleteInvoice(invoice.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Scan Invoice</h1>
          <p className="text-slate-500">Capture or upload invoices to automatically extract data</p>
        </div>
        <button
          onClick={() => {
            stopCamera();
            setShowHistory(true);
          }}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2"
        >
          <FileText size={18} /> History
        </button>
      </div>

      {/* Voice command hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Camera size={20} className="text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-blue-800">Try saying...</p>
          <p className="text-sm text-blue-600">"Scan this invoice" or "Upload bill image"</p>
        </div>
      </div>

      {/* Error display */}
      {error && !showHistory && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main content */}
      {!showHistory && (
        <>
          {scanStatus === 'idle' && !capturedImage && (
            <>
              {scanMode === 'camera' && renderCameraView()}
              {scanMode === 'upload' && capturedImage && renderReviewView()}
              {scanMode === 'upload' && !capturedImage && (
                <div className="max-w-xl mx-auto">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white rounded-2xl p-12 text-center cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors"
                  >
                    <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Invoice Image</h3>
                    <p className="text-slate-500 mb-4">Click to browse or drag and drop</p>
                    <p className="text-sm text-slate-400">Supports JPEG, PNG (Max 10MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex justify-center gap-4 mt-6">
                    <button
                      onClick={() => {
                        setScanMode('camera');
                        startCamera();
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg flex items-center gap-2"
                    >
                      <Camera size={18} /> Use Camera
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {scanStatus === 'processing' && renderProcessingView()}
          {scanStatus === 'review' && renderReviewView()}
          {scanStatus === 'complete' && renderCompleteView()}
        </>
      )}

      {showHistory && renderHistoryView()}
    </div>
  );
};

export default InvoiceScanner;
