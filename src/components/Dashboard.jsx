'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatCompactNumber = (num) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(2) + ' K';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '38': 'Ladakh',
  '00': 'Export'
};

const SERVICE_PRESETS = [
  { hsnSac: '998314', title: 'Web Development Services', label: '998314 - Web Development' },
  { hsnSac: '998315', title: 'Domain and Hosting Services', label: '998315 - Domain and Hosting' },
  { hsnSac: '998382', title: 'Photography Services', label: '998382 - Photography' },
  { hsnSac: '9989', title: 'Printing and Reproduction Services', label: '9989 - Printing and Reproduction' },
];

function ClientSearchCombobox({ clients, selectedClientId, onSelectClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.state && c.state.toLowerCase().includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
        Select Client
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Type to search client name, email, GSTIN..."
          value={isOpen ? search : (selectedClient ? `${selectedClient.name} (${selectedClient.state})` : '')}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full p-2.5 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white font-semibold text-sm cursor-pointer shadow-sm"
        />
        <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl divide-y divide-slate-100 animate-fade-in">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center font-medium">
              No clients found matching "{search}"
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectClient(c.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`p-3 hover:bg-red-50/70 cursor-pointer transition-colors flex items-center justify-between text-xs ${c.id === selectedClientId ? 'bg-red-50 border-l-4 border-[#E94444]' : ''
                  }`}
              >
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    {c.name}
                    {c.contactPerson && (
                      <span className="text-[11px] font-normal text-slate-500">
                        • {c.contactPerson}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{c.email}</div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {c.state}
                  </span>
                  {c.gstin && (
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                      {c.gstin}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StateSearchCombobox({ selectedState, onSelectState }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allStates = Object.entries(STATE_CODES).map(([code, name]) => ({ code, name }));
  const filtered = allStates.filter(s => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.includes(q);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
        Billing State
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Type to search state..."
          value={isOpen ? search : selectedState}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full p-2.5 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white font-semibold text-sm cursor-pointer shadow-sm"
        />
        <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl divide-y divide-slate-100 animate-fade-in">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center font-medium">
              No states found matching "{search}"
            </div>
          ) : (
            filtered.map(s => (
              <div
                key={s.code}
                onClick={() => {
                  onSelectState(s.name, s.code);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`p-2.5 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between text-xs ${s.name === selectedState ? 'bg-red-50 font-bold text-[#E94444]' : 'text-slate-800'
                  }`}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                  Code: {s.code}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ initialInvoices, initialCertificates }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [recentFilter, setRecentFilter] = useState('ALL');

  // Independent per-card stats visibility states
  const [showSalesStats, setShowSalesStats] = useState(false);
  const [showOutstandingStats, setShowOutstandingStats] = useState(false);

  // Month and Year filter states for individual boxes
  const [salesFilterMonth, setSalesFilterMonth] = useState('ALL');
  const [salesFilterYear, setSalesFilterYear] = useState(() => new Date().getFullYear().toString());

  const [outFilterMonth, setOutFilterMonth] = useState('ALL');
  const [outFilterYear, setOutFilterYear] = useState('ALL');

  const [invoices, setInvoices] = useState(initialInvoices || []);
  const [clients, setClients] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  // In-App PDF Viewer Modal state
  const [pdfViewerInvoice, setPdfViewerInvoice] = useState(null);
  const [pdfViewerStationery, setPdfViewerStationery] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // New Client Form state
  const [clientForm, setClientForm] = useState({
    id: null,
    name: '',
    email: '',
    firstName: '',
    lastName: '',
    state: 'Gujarat',
    stateCode: '24',
    gstin: '',
    address: ''
  });
  const [clientFormError, setClientFormError] = useState('');
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  // New Invoice Form state
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    orderNumber: '',
    clientId: '',
    status: 'DRAFT',
    domesticExport: 'Domestic',
    currency: 'INR',
    currencySymbol: '₹',
    taxRule: 'Auto',
    dueDate: '',
    discount: 0,
    lineItems: [{ hsnSac: '998314', title: '', description: '', unit: '1', quantity: 1, amount: 0, adjustPercent: 0 }]
  });
  const [invoiceFormError, setInvoiceFormError] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Search and Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Service Presets management state
  const [newPresetHsn, setNewPresetHsn] = useState('');
  const [newPresetTitle, setNewPresetTitle] = useState('');

  // Dropdown search filter states
  const [clientSearchInInvoice, setClientSearchInInvoice] = useState('');
  const [stateSearchInClient, setStateSearchInClient] = useState('');

  // Import / Export state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileRef = useRef(null);

  // Custom Confirmation & Alert Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: null,
    isAlert: false
  });

  const showConfirmModal = ({ title, message, confirmText = 'Confirm', type = 'danger', onConfirm }) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type,
      onConfirm,
      isAlert: false
    });
  };

  const showAlertModal = (message, title = 'Notice', type = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      type,
      onConfirm: null,
      isAlert: true
    });
  };

  const closeModalConfig = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Auto-fill Supply Region, Currency & Tax Rule when Client is selected
  const handleClientSelectInInvoice = (clientId) => {
    const c = clients.find(item => item.id === clientId);
    if (!c) {
      setInvoiceForm(prev => ({ ...prev, clientId }));
      return;
    }

    const isExport = !c.stateCode || c.stateCode === '00' || c.state.toLowerCase().includes('export') || c.state.toLowerCase().includes('foreign') || c.state.toLowerCase().includes('dubai') || c.state.toLowerCase().includes('us');
    const isLocal = c.stateCode === '24' || c.state.toLowerCase().trim() === 'gujarat';

    let domesticExport = 'Domestic';
    let currency = 'INR';
    let currencySymbol = '₹';
    let taxRule = 'Auto';

    if (isExport) {
      domesticExport = 'Export';
      currency = 'USD';
      currencySymbol = '$';
      taxRule = 'None';
    } else if (isLocal) {
      domesticExport = 'Domestic';
      currency = 'INR';
      currencySymbol = '₹';
      taxRule = 'CGST_SGST';
    } else {
      domesticExport = 'Domestic';
      currency = 'INR';
      currencySymbol = '₹';
      taxRule = 'IGST';
    }

    setInvoiceForm(prev => ({
      ...prev,
      clientId,
      domesticExport,
      currency,
      currencySymbol,
      taxRule
    }));
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase().trim();
    const matchNumber = inv.invoiceNumber.toLowerCase().includes(query);
    const matchOrder = inv.orderNumber ? inv.orderNumber.toLowerCase().includes(query) : false;
    const matchClientName = inv.client?.name ? inv.client.name.toLowerCase().includes(query) : false;
    const matchesSearch = query === '' || matchNumber || matchOrder || matchClientName;

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesClient = clientFilter === 'ALL' || inv.clientId === clientFilter;
    const matchesRegion = regionFilter === 'ALL' || inv.domesticExport === regionFilter;

    return matchesSearch && matchesStatus && matchesClient && matchesRegion;
  });

  // Paginated invoices
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, clientFilter]);

  // Dropdown search helpers
  const filteredClientsForInvoice = clients.filter(c => {
    const q = clientSearchInInvoice.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.state && c.state.toLowerCase().includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  const allStateNames = Object.values(STATE_CODES);
  const filteredStatesForClient = allStateNames.filter(name => {
    const q = stateSearchInClient.toLowerCase().trim();
    if (!q) return true;
    return name.toLowerCase().includes(q);
  });

  const [settings, setSettings] = useState({
    business_name: 'ZERO DESIGNS PVT. LTD.',
    business_address: '',
    business_extra_info: '',
    business_bank_detail: '',
    business_lut_arn: '',
    invoice_prefix: 'INV-',
    invoice_next_number: '',
    invoice_due_days: '14',
    invoice_footer: '',
    service_presets: ''
  });

  const getServicePresets = () => {
    if (settings.service_presets) {
      try {
        const parsed = JSON.parse(settings.service_presets);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore parse error
      }
    }
    return SERVICE_PRESETS;
  };

  const servicePresetsList = getServicePresets();

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok) setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
    fetchInvoices();
    fetchSettings();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (res.ok) setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (res.ok) setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  const generateOrderNumber = (status, domesticExport) => {
    const now = new Date();
    const century = String(now.getFullYear()).slice(0, 2); // "20"
    const month = String(now.getMonth() + 1).padStart(2, '0'); // "08"

    const fiscalMonth = now.getMonth();
    const startYear = fiscalMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const endYear = startYear + 1;
    const startYearShort = String(startYear).slice(-2);
    const endYearShort = String(endYear).slice(-2);
    const fy = `${startYearShort}${endYearShort}`; // "2627"

    let prefix = 'D';
    if (status === 'PROFORMA') {
      prefix = domesticExport === 'Export' ? 'PE' : 'PD';
    } else {
      prefix = domesticExport === 'Export' ? 'E' : 'D';
    }

    const commonMonthSuffix = `${century}${fy}${month}`; // e.g. "20262708"
    let maxSeq = 0;

    // Scan all existing order numbers matching any prefix (D, E, PD, PE) for this month to keep unified serial sequence
    for (const inv of invoices) {
      if (inv.orderNumber) {
        const match = inv.orderNumber.match(/^(?:D|E|PD|PE)20\d{4}\d{2}(\d{2,4})$/);
        if (match && inv.orderNumber.includes(commonMonthSuffix)) {
          const seqNum = parseInt(match[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    return `${prefix}${commonMonthSuffix}${nextSeq}`;
  };

  // Suggest next invoice number and automatic default due date
  useEffect(() => {
    if (isInvoiceModalOpen) {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      const defaultDueDateStr = defaultDueDate.toISOString().split('T')[0];

      const targetPrefix = invoiceForm.status === 'PROFORMA' ? 'PINV-' : (settings.invoice_prefix || 'INV-');

      // If creating new invoice OR converting Proforma to Tax Invoice
      const isNew = !invoiceForm.id;
      const isConvertingFromProforma = invoiceForm.id && invoiceForm.status !== 'PROFORMA' && (invoiceForm.invoiceNumber?.startsWith('PINV-') || invoiceForm.orderNumber?.startsWith('PD') || invoiceForm.orderNumber?.startsWith('PE'));

      if (isNew || isConvertingFromProforma) {
        let maxNum = 0;
        let padLen = 4;

        if (invoices.length > 0) {
          for (const inv of invoices) {
            if (inv.invoiceNumber && inv.invoiceNumber.startsWith(targetPrefix)) {
              const numMatch = inv.invoiceNumber.match(/(\d+)$/);
              if (numMatch) {
                const n = parseInt(numMatch[1], 10);
                if (n > maxNum) {
                  maxNum = n;
                  padLen = numMatch[1].length;
                }
              }
            }
          }
        }

        let generatedInvoiceNumber = '';
        if (maxNum === 0 && targetPrefix === (settings.invoice_prefix || 'INV-') && settings.invoice_next_number) {
          generatedInvoiceNumber = `${targetPrefix}${settings.invoice_next_number}`;
        } else {
          const nextNum = maxNum + 1;
          generatedInvoiceNumber = `${targetPrefix}${String(nextNum).padStart(padLen, '0')}`;
        }

        setInvoiceForm(prev => ({
          ...prev,
          id: isConvertingFromProforma ? null : prev.id,
          invoiceNumber: generatedInvoiceNumber,
          orderNumber: generateOrderNumber(prev.status, prev.domesticExport),
          dueDate: prev.dueDate || defaultDueDateStr
        }));
      }
    }
  }, [invoices, isInvoiceModalOpen, settings, invoiceForm.id, invoiceForm.status, invoiceForm.domesticExport]);


  // ── EXPORT TO EXCEL ─────────────────────────────────────────────────────────
  const handleExportExcel = (invoicesToExport) => {
    const list = Array.isArray(invoicesToExport) ? invoicesToExport : filteredInvoices;
    const exportData = list.map((inv, idx) => {
      const date = new Date(inv.createdAt);
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
      const fmt = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      const subtotal = inv.subtotal ?? 0;
      const cgst = inv.cgst ?? 0;
      const sgst = inv.sgst ?? 0;
      const igst = inv.igst ?? 0;
      const tax = cgst + sgst + igst;
      const total = inv.totalAmount ?? 0;
      const sym = inv.currencySymbol || '₹';

      return {
        'Sr. No': idx + 1,
        'Invoice No': inv.invoiceNumber,
        'Order No': inv.orderNumber || '',
        'Invoice Date': fmt(date),
        'Due Date': fmt(dueDate),
        'Client Name': inv.client?.name || '',
        'Client Email': inv.client?.email || '',
        'Client Address': inv.client?.address || '',
        'GSTIN': inv.client?.gstin || '',
        'State': inv.client?.state || '',
        'State Code': inv.client?.stateCode || '',
        'Status': inv.status,
        'Region': inv.domesticExport || 'Domestic',
        'Currency': inv.currency || 'INR',
        'Sub Total': subtotal,
        'CGST (9%)': cgst,
        'SGST (9%)': sgst,
        'IGST (18%)': igst,
        'Total Tax': tax,
        'Total Amount': total,
        'Total Amount (Formatted)': `${sym}${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'LUT ARN': inv.lutArn || '',
        'Title / Description': inv.lineItems?.[0]?.title || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 36 }, { wch: 32 }, { wch: 50 }, { wch: 20 }, { wch: 18 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 24 }, { wch: 20 }, { wch: 32 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `zero-designs-invoices-${today}.xlsx`);
  };

  // ── IMPORT FROM EXCEL / CSV ──────────────────────────────────────────────────
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset file input

    setIsImporting(true);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        setImportResult({ error: 'No data rows found in the file.' });
        setIsImporting(false);
        return;
      }

      // Send rows to API
      const res = await fetch('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });

      const result = await res.json();

      if (!res.ok) {
        setImportResult({ error: result.error || 'Import failed' });
      } else {
        setImportResult(result);
        // Refresh invoices list
        await fetchInvoices();
      }
    } catch (err) {
      setImportResult({ error: 'Failed to read file: ' + err.message });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  // Handle Client Form Submit
  const handleClientSubmit = async (e) => {
    e.preventDefault();
    setClientFormError('');
    setIsSubmittingClient(true);

    try {
      const isEdit = !!clientForm.id;
      const url = isEdit ? `/api/clients/${clientForm.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save client');
      }

      await fetchClients();
      setIsClientModalOpen(false);
      setClientForm({ name: '', email: '', state: 'Gujarat', stateCode: '24', gstin: '', address: '' });
    } catch (err) {
      setClientFormError(err.message);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleStartEditClient = (client) => {
    setClientForm({
      id: client.id,
      name: client.name,
      email: client.email,
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      state: client.state || 'Export/Foreign',
      stateCode: client.stateCode || '',
      gstin: client.gstin || '',
      address: client.address || ''
    });
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = (id) => {
    const client = clients.find(c => c.id === id);
    showConfirmModal({
      title: 'Delete Client',
      message: `Are you sure you want to delete client "${client?.name || 'Selected Client'}"? Associated invoice data will remain preserved.`,
      confirmText: 'Delete Client',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete client');
          await fetchClients();
        } catch (err) {
          showAlertModal(err.message, 'Delete Error', 'danger');
        }
      }
    });
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      setSettings(data);
      setSettingsSuccess('Settings updated successfully!');
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Line Item Inputs in Invoice Form
  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...invoiceForm.lineItems];
    updatedItems[index][field] = value;
    setInvoiceForm(prev => ({ ...prev, lineItems: updatedItems }));
  };

  const addLineItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { hsnSac: '998314', title: '', description: '', unit: '1', quantity: 1, amount: 0, adjustPercent: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (invoiceForm.lineItems.length === 1) return;
    const updatedItems = invoiceForm.lineItems.filter((_, i) => i !== index);
    setInvoiceForm(prev => ({ ...prev, lineItems: updatedItems }));
  };

  // Calculate live totals for the invoice form
  const getFormTotals = () => {
    let subtotal = 0;
    invoiceForm.lineItems.forEach(item => {
      const itemQty = parseFloat(item.quantity) || 0;
      const itemAmount = parseFloat(item.amount) || 0;
      const itemDiscount = itemQty * itemAmount * ((parseFloat(item.adjustPercent) || 0) / 100);
      subtotal += (itemQty * itemAmount) - itemDiscount;
    });

    const selectedClient = clients.find(c => c.id === invoiceForm.clientId);
    const isLocalState = selectedClient?.state?.toLowerCase().trim() === 'gujarat';
    const isExport = invoiceForm.domesticExport === 'Export' || selectedClient?.state?.toLowerCase().includes('export') || selectedClient?.state?.toLowerCase().includes('foreign');

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (invoiceForm.taxRule === 'None') {
      cgst = 0;
      sgst = 0;
      igst = 0;
    } else if (invoiceForm.taxRule === 'IGST') {
      cgst = 0;
      sgst = 0;
      igst = subtotal * 0.18;
    } else if (invoiceForm.taxRule === 'CGST_SGST') {
      cgst = subtotal * 0.09;
      sgst = subtotal * 0.09;
      igst = 0;
    } else if (invoiceForm.clientId && !isExport) {
      if (isLocalState) {
        cgst = subtotal * 0.09;
        sgst = subtotal * 0.09;
      } else {
        igst = subtotal * 0.18;
      }
    }

    const discountAmount = parseFloat(invoiceForm.discount) || 0;
    const totalAmount = subtotal + cgst + sgst + igst - discountAmount;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalAmount,
      isLocalState
    };
  };

  const formTotals = getFormTotals();

  const getCurrencySymbol = (inv) => {
    if (!inv) return '₹';
    return inv.currencySymbol ? inv.currencySymbol : (inv.domesticExport === 'Export' ? '$' : '₹');
  };

  // Handle Invoice Form Submit
  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    setInvoiceFormError('');
    setIsSubmittingInvoice(true);

    if (!invoiceForm.clientId) {
      setInvoiceFormError('Please select a client.');
      setIsSubmittingInvoice(false);
      return;
    }

    try {
      const isEdit = !!invoiceForm.id;
      const url = isEdit ? `/api/invoices/${invoiceForm.id}` : '/api/invoices';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save invoice');
      }

      await fetchInvoices();
      setIsInvoiceModalOpen(false);
      setInvoiceForm({
        invoiceNumber: '',
        orderNumber: '',
        clientId: '',
        status: 'DRAFT',
        domesticExport: 'Domestic',
        currency: 'INR',
        currencySymbol: '₹',
        taxRule: 'Auto',
        dueDate: '',
        discount: 0,
        lineItems: [{ hsnSac: '998314', title: '', description: '', unit: '1', quantity: 1, amount: 0, adjustPercent: 0 }]
      });
    } catch (err) {
      setInvoiceFormError(err.message);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleDeleteInvoice = (id) => {
    const inv = invoices.find(i => i.id === id);
    showConfirmModal({
      title: 'Delete Invoice',
      message: `Are you sure you want to delete invoice ${inv ? inv.invoiceNumber : 'selected'}? This action cannot be undone.`,
      confirmText: 'Delete Invoice',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete invoice');

          setSelectedInvoice(null);
          await fetchInvoices();
        } catch (err) {
          showAlertModal(err.message, 'Delete Error', 'danger');
        }
      }
    });
  };

  const handleStartEditInvoice = (inv) => {
    setInvoiceForm({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber || '',
      clientId: inv.clientId,
      status: inv.status,
      domesticExport: inv.domesticExport || 'Domestic',
      currency: inv.currency || 'INR',
      currencySymbol: inv.currencySymbol || '₹',
      taxRule: inv.taxRule || 'Auto',
      lutArn: inv.lutArn || '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      discount: inv.discount || 0,
      lineItems: inv.lineItems.map(item => ({
        hsnSac: item.hsnSac || '998314',
        title: item.title,
        description: item.description || '',
        unit: item.unit || '1',
        quantity: item.quantity,
        amount: item.amount,
        adjustPercent: item.adjustPercent || 0
      }))
    });
    setSelectedInvoice(null);
    setIsInvoiceModalOpen(true);
  };


  // ── MULTI-SELECT & BULK ACTION HELPERS ──────────────────────────────────────
  const isAllPaginatedSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
  const isSomePaginatedSelected = paginatedInvoices.some(inv => selectedInvoiceIds.includes(inv.id)) && !isAllPaginatedSelected;

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      const paginatedIds = paginatedInvoices.map(inv => inv.id);
      setSelectedInvoiceIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      const paginatedIds = paginatedInvoices.map(inv => inv.id);
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
    }
  };

  const toggleSelectInvoice = (id) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedInvoiceIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedInvoiceIds.length === 0) return;
    showConfirmModal({
      title: `Delete ${selectedInvoiceIds.length} Invoice(s)`,
      message: `Are you sure you want to permanently delete ${selectedInvoiceIds.length} selected invoice(s)? This action cannot be undone.`,
      confirmText: `Delete ${selectedInvoiceIds.length} Invoices`,
      type: 'danger',
      onConfirm: async () => {
        try {
          let deleteErrors = 0;
          await Promise.all(selectedInvoiceIds.map(async (id) => {
            const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
            if (!res.ok) deleteErrors++;
          }));

          if (deleteErrors > 0) {
            showAlertModal(`Deleted some invoices, but ${deleteErrors} failed.`, 'Warning', 'warning');
          }
          setSelectedInvoiceIds([]);
          await fetchInvoices();
        } catch (err) {
          showAlertModal('Bulk delete failed: ' + err.message, 'Delete Error', 'danger');
        }
      }
    });
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedInvoiceIds.length === 0) return;
    try {
      let updateErrors = 0;
      await Promise.all(selectedInvoiceIds.map(async (id) => {
        const inv = invoices.find(i => i.id === id);
        if (!inv) return;
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...inv, status: newStatus })
        });
        if (!res.ok) updateErrors++;
      }));

      if (updateErrors > 0) {
        showAlertModal(`Updated some invoices, but ${updateErrors} failed.`, 'Status Update Warning', 'warning');
      }
      await fetchInvoices();
    } catch (err) {
      showAlertModal('Bulk status update failed: ' + err.message, 'Update Error', 'danger');
    }
  };

  const handleBulkPrint = (stationery = false) => {
    if (selectedInvoiceIds.length === 0) return;
    selectedInvoiceIds.forEach((id) => {
      const url = `/invoice/${id}/print${stationery ? '?stationery=true' : ''}`;
      window.open(url, '_blank');
    });
  };

  // --- OVERVIEW STATS CALCULATION ---
  const totalInvoices = invoices.length;
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const salesAmount = invoices.reduce((sum, inv) => {
    if (inv.status === 'PROFORMA' || inv.status === 'DRAFT' || inv.status === 'CANCELLED' || inv.status === 'CANCEL') return sum;
    const d = new Date(inv.createdAt);
    const m = d.getMonth().toString();
    const y = d.getFullYear().toString();

    if (salesFilterYear !== 'ALL' && y !== salesFilterYear) return sum;
    if (salesFilterMonth !== 'ALL' && m !== salesFilterMonth) return sum;

    return sum + (inv.totalAmount || 0);
  }, 0);

  const outstandingAmount = invoices.reduce((sum, inv) => {
    if (inv.status !== 'UNPAID') return sum;
    const d = new Date(inv.createdAt);
    const m = d.getMonth().toString();
    const y = d.getFullYear().toString();

    if (outFilterYear !== 'ALL' && y !== outFilterYear) return sum;
    if (outFilterMonth !== 'ALL' && m !== outFilterMonth) return sum;

    return sum + (inv.totalAmount || 0);
  }, 0);

  const totalClients = clients.length;
  const recentActivity = [...invoices]
    .filter(inv => recentFilter === 'ALL' || inv.status === recentFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // --- CHART DATA CALCULATION ---
  const monthlyRevenueData = (() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[key] = { name: key, revenue: 0 };
    }
    invoices.forEach(inv => {
      if (inv.status !== 'PROFORMA' && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && inv.status !== 'CANCEL') {
        const d = new Date(inv.createdAt);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (months[key]) {
          months[key].revenue += (inv.totalAmount || 0);
        }
      }
    });
    return Object.values(months);
  })();

  const statusData = [
    { name: 'PAID', value: invoices.filter(i => i.status === 'PAID').length, color: '#10B981' },
    { name: 'UNPAID', value: invoices.filter(i => i.status === 'UNPAID').length, color: '#F59E0B' },
    { name: 'DRAFT', value: invoices.filter(i => i.status === 'DRAFT').length, color: '#94A3B8' },
    { name: 'PROFORMA', value: invoices.filter(i => i.status === 'PROFORMA').length, color: '#3B82F6' },
    { name: 'CANCELLED', value: invoices.filter(i => i.status === 'CANCELLED' || i.status === 'CANCEL').length, color: '#EF4444' },
  ].filter(d => d.value > 0);


  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-800 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 flex-shrink-0 relative z-20">
        <div className="p-6 border-b border-slate-800 flex items-center justify-start h-20">
          <img src="/zero-logo.svg" alt="Zero Designs" className="h-10 w-auto brightness-0 invert" />
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          {/* Overview Tab */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'overview' ? 'bg-[#E94444] text-white shadow-lg shadow-[#E94444]/30' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            Overview
          </button>

          {/* Invoices Tab */}
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'invoices' ? 'bg-[#E94444] text-white shadow-lg shadow-[#E94444]/30' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            Invoices
          </button>

          {/* Clients Tab */}
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'clients' ? 'bg-[#E94444] text-white shadow-lg shadow-[#E94444]/30' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Clients
          </button>

          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 mt-auto ${activeTab === 'settings' ? 'bg-[#E94444] text-white shadow-lg shadow-[#E94444]/30' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </button>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-slate-400 hover:bg-slate-800 hover:text-red-400`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Sign Out
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
              {activeTab}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {activeTab === 'overview' && 'Welcome back, Zero Designs!'}
              {activeTab === 'invoices' && 'Manage your professional invoices and billing.'}
              {activeTab === 'clients' && 'Manage your client directory.'}
              {activeTab === 'settings' && 'Configure business details and app settings.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            <button
              onClick={() => {
                setClientForm({ id: '', name: '', email: '', state: 'Gujarat', stateCode: '24', gstin: '', address: '' });
                setIsClientModalOpen(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 shadow-sm transition-all"
            >
              + New Client
            </button>
            <button
              onClick={() => {
                setInvoiceForm({
                  invoiceNumber: '', orderNumber: '', clientId: '', status: 'DRAFT', domesticExport: 'Domestic', currency: 'INR', currencySymbol: '₹', taxRule: 'Auto', dueDate: '', discount: 0, lineItems: [{ hsnSac: '998314', title: '', description: '', unit: '1', quantity: 1, amount: 0, adjustPercent: 0 }]
                });
                setIsInvoiceModalOpen(true);
              }}
              className="px-4 py-2 bg-[#E94444] hover:bg-[#d63a3a] text-white text-sm font-bold rounded-lg shadow shadow-[#E94444]/20 transition-all flex items-center gap-2"
            >
              + New Invoice
            </button>
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-200 transition-colors">
              <span className="font-bold text-slate-500">ZD</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto">

            {/* OVERVIEW TAB CONTENT */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in-up">

                {/* Stats Control Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Financial Revenue Overview
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">View revenue stats and outstanding balance by period. Click eye icon to reveal.</p>
                  </div>
                </div>

                {/* Stats Grid - 2 Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Sales Revenue */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Sales Revenue
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={salesFilterMonth}
                          onChange={(e) => setSalesFilterMonth(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        >
                          <option value="ALL">All Months</option>
                          {MONTH_NAMES.map((name, idx) => (
                            <option key={idx} value={idx.toString()}>{name}</option>
                          ))}
                        </select>
                        <select
                          value={salesFilterYear}
                          onChange={(e) => {
                            setSalesFilterYear(e.target.value);
                            setSalesFilterMonth('ALL');
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        >
                          <option value="ALL">All Years</option>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                        </select>
                        <button onClick={() => setShowSalesStats(!showSalesStats)} className="text-slate-400 hover:text-emerald-600 transition-colors ml-1" title="Toggle Sales Visibility">
                          {showSalesStats ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 cursor-pointer" onClick={() => setShowSalesStats(!showSalesStats)}>
                        {showSalesStats ? `₹${salesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ * * * * *'}
                      </h3>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        {salesFilterMonth === 'ALL' ? 'All Months' : MONTH_NAMES[parseInt(salesFilterMonth)]} {salesFilterYear === 'ALL' ? '' : salesFilterYear}
                      </p>
                    </div>
                  </div>

                  {/* Outstanding */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Outstanding
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={outFilterMonth}
                          onChange={(e) => setOutFilterMonth(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        >
                          <option value="ALL">All Months</option>
                          {MONTH_NAMES.map((name, idx) => (
                            <option key={idx} value={idx.toString()}>{name}</option>
                          ))}
                        </select>
                        <select
                          value={outFilterYear}
                          onChange={(e) => {
                            setOutFilterYear(e.target.value);
                            setOutFilterMonth('ALL');
                          }}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        >
                          <option value="ALL">All Years</option>
                          <option value="2026">2026</option>
                          <option value="2025">2025</option>
                          <option value="2024">2024</option>
                          <option value="2023">2023</option>
                        </select>
                        <button onClick={() => setShowOutstandingStats(!showOutstandingStats)} className="text-slate-400 hover:text-orange-600 transition-colors ml-1" title="Toggle Outstanding Visibility">
                          {showOutstandingStats ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 cursor-pointer" onClick={() => setShowOutstandingStats(!showOutstandingStats)}>
                        {showOutstandingStats ? `₹${outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ * * * * *'}
                      </h3>
                      <p className="text-[11px] text-orange-600 font-semibold mt-1">
                        {outFilterMonth === 'ALL' ? 'All Months' : MONTH_NAMES[parseInt(outFilterMonth)]} {outFilterYear === 'ALL' ? '' : outFilterYear}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Unpaid Invoices Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-base font-bold text-slate-800">Unpaid Invoices</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setActiveTab('invoices'); setStatusFilter('UNPAID'); }} className="text-sm px-3 py-1.5 rounded-lg bg-red-50 font-semibold text-[#E94444] hover:bg-red-100 transition-colors">
                        View All Unpaid →
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                          <th className="py-3 px-6 w-32">Invoice No</th>
                          <th className="py-3 px-6">Client</th>
                          <th className="py-3 px-6 w-32">Date</th>
                          <th className="py-3 px-6 text-right w-36">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.filter(i => i.status === 'UNPAID').slice(0, 5).length === 0 ? (
                          <tr><td colSpan="4" className="py-6 text-center text-slate-400">No outstanding invoices.</td></tr>
                        ) : invoices.filter(i => i.status === 'UNPAID').slice(0, 5).map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-6 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                            <td className="py-3 px-6 font-semibold text-slate-800">{inv.client?.name || 'Unknown Client'}</td>
                            <td className="py-3 px-6 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="py-3 px-6 text-right font-bold text-slate-800">
                              {inv.currencySymbol} {inv.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoices List Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-base font-bold text-slate-800">Invoices List</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={recentFilter}
                        onChange={(e) => setRecentFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="ALL">All Status</option>
                        <option value="UNPAID">Pending (Unpaid)</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PROFORMA">Proforma</option>
                        <option value="PAID">Paid</option>
                      </select>
                      <button onClick={() => setActiveTab('invoices')} className="text-sm px-3 py-1.5 rounded-lg bg-red-50 font-semibold text-[#E94444] hover:bg-red-100 transition-colors">
                        View All →
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                          <th className="py-3 px-6 w-32">Invoice No</th>
                          <th className="py-3 px-6">Client</th>
                          <th className="py-3 px-6 w-32">Date</th>
                          <th className="py-3 px-6 w-24">Status</th>
                          <th className="py-3 px-6 text-right w-36">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentActivity.length === 0 ? (
                          <tr><td colSpan="5" className="py-6 text-center text-slate-400">No invoices generated yet.</td></tr>
                        ) : recentActivity.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-6 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                            <td className="py-3 px-6 font-semibold text-slate-800">{inv.client?.name || 'Unknown Client'}</td>
                            <td className="py-3 px-6 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="py-3 px-6">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                inv.status === 'UNPAID' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                  'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-bold text-slate-800">
                              {inv.currencySymbol} {inv.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Revenue Trend Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Revenue Trend (Last 6 Months)</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#E94444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#E94444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₹${formatCompactNumber(value)}`} />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#E94444" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 4, fill: '#E94444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-2">Invoice Status</h3>
                    <div className="h-64 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'invoices' && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Invoices List</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Showing {filteredInvoices.length} of {invoices.length} entries</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder="Search invoice or client..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white w-40 sm:w-48"
                    />

                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="TAX INVOICE">TAX INVOICE</option>
                      <option value="UNPAID">UNPAID</option>
                      <option value="PAID">PAID</option>
                      <option value="PROFORMA">PROFORMA</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>

                    {/* Region Filter */}
                    <select
                      value={regionFilter}
                      onChange={(e) => {
                        setRegionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                    >
                      <option value="ALL">All Regions</option>
                      <option value="Domestic">Domestic</option>
                      <option value="Export">Export</option>
                    </select>

                    {/* Client Filter */}
                    <select
                      value={clientFilter}
                      onChange={(e) => {
                        setClientFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white max-w-[150px]"
                    >
                      <option value="ALL">All Clients</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Clear Filters Button */}
                    {(searchQuery !== '' || statusFilter !== 'ALL' || clientFilter !== 'ALL' || regionFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                          setClientFilter('ALL');
                          setRegionFilter('ALL');
                          setCurrentPage(1);
                        }}
                        className="px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-300/60 shadow-sm transition-all"
                      >
                        Clear Filters
                      </button>
                    )}

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    {/* Export Excel Button */}
                    <button
                      onClick={handleExportExcel}
                      title="Export current filtered invoices to Excel (.xlsx)"
                      className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 shadow-sm transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export
                    </button>

                    {/* Import Excel Button */}
                    <button
                      onClick={() => importFileRef.current?.click()}
                      disabled={isImporting}
                      title="Import invoices from Excel (.xlsx) or CSV file"
                      className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isImporting ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 5 17 10" />
                          <line x1="12" y1="5" x2="12" y2="15" />
                        </svg>
                      )}
                      {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleImportExcel}
                    />
                  </div>
                </div>

                {/* Import Result Banner */}
                {importResult && (
                  <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${importResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                    <div className="flex-1">
                      {importResult.error ? (
                        <span>Import failed: {importResult.error}</span>
                      ) : (
                        <span>
                          Import complete! <strong>{importResult.imported}</strong> invoices added.
                          {importResult.skipped > 0 && <span className="ml-2 text-amber-700"> ({importResult.skipped} skipped — duplicates)</span>}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setImportResult(null)} className="ml-2 text-slate-400 hover:text-slate-700 font-bold flex-shrink-0">x</button>
                  </div>
                )}

                {/* Bulk Action Toolbar */}
                {selectedInvoiceIds.length > 0 && (
                  <div className="mb-4 p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="bg-[#E94444] text-white px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                        {selectedInvoiceIds.length} Selected
                      </span>
                      {selectedInvoiceIds.length < filteredInvoices.length && (
                        <button
                          onClick={() => setSelectedInvoiceIds(filteredInvoices.map(i => i.id))}
                          className="text-xs text-slate-300 hover:text-white underline font-medium transition-colors"
                        >
                          Select All {filteredInvoices.length} Filtered Invoices
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                        <span className="text-slate-400 text-xs px-1 font-medium">Set Status:</span>
                        <button
                          onClick={() => handleBulkStatusChange('PAID')}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg font-semibold transition-colors border border-emerald-500/30"
                        >
                          Paid
                        </button>
                        <button
                          onClick={() => handleBulkStatusChange('UNPAID')}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold transition-colors border border-amber-500/30"
                        >
                          Unpaid
                        </button>
                        <button
                          onClick={() => handleBulkStatusChange('PROFORMA')}
                          className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-semibold transition-colors border border-blue-500/30"
                        >
                          Proforma
                        </button>
                      </div>

                      <button
                        onClick={() => handleBulkPrint(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-[#E94444]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
                        </svg>
                        Print ({selectedInvoiceIds.length})
                      </button>

                      <button
                        onClick={() => handleExportExcel(invoices.filter(i => selectedInvoiceIds.includes(i.id)))}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export ({selectedInvoiceIds.length})
                      </button>

                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        Delete ({selectedInvoiceIds.length})
                      </button>

                      <button
                        onClick={clearSelection}
                        className="px-2 py-1.5 text-slate-400 hover:text-white font-bold transition-colors ml-1"
                        title="Clear Selection"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                        <th className="py-4 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllPaginatedSelected}
                            ref={el => { if (el) el.indeterminate = isSomePaginatedSelected; }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-[#E94444] focus:ring-[#E94444] cursor-pointer"
                            title="Select / Deselect all visible invoices"
                          />
                        </th>
                        <th className="py-4 px-4 w-28">Invoice</th>
                        <th className="py-4 px-4 w-28">Order No</th>
                        <th className="py-4 px-4">Client</th>
                        <th className="py-4 px-4 whitespace-nowrap">Date</th>
                        <th className="py-4 px-4 text-right whitespace-nowrap">Total Amount</th>
                        <th className="py-4 px-4 text-center w-24">Status</th>
                        <th className="py-4 px-4 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {paginatedInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className={`transition-colors duration-200 group ${selectedInvoiceIds.includes(inv.id) ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/50'}`}
                        >
                          <td className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.includes(inv.id)}
                              onChange={() => toggleSelectInvoice(inv.id)}
                              className="w-4 h-4 rounded border-slate-300 text-[#E94444] focus:ring-[#E94444] cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 font-mono text-[#E94444] font-semibold">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-500 text-xs">
                            {inv.orderNumber || 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-800">{inv.client?.name || 'Loading client...'}</div>
                            <div className="text-xs text-slate-400">{inv.client?.email}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-slate-800">
                            {getCurrencySymbol(inv)}{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : inv.status === 'PROFORMA'
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : inv.status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : inv.status === 'DRAFT'
                                    ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all"
                                title="View Details"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => handleStartEditInvoice(inv)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-all"
                                title="Edit Invoice"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              {/* Full PDF – opens in new tab with toolbar (print/save as PDF from there) */}
                              <button
                                onClick={() => window.open(`/invoice/${inv.id}/print`, '_blank')}
                                className="p-1.5 bg-[#F5F3EA] text-[#E94444] hover:bg-[#E94444]/10 rounded-lg border border-[#E94444]/20 transition-all"
                                title="Full PDF – View / Print / Save as PDF (With Header & Footer)"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                              </button>
                              {/* Stationery PDF – opens in new tab with toolbar */}
                              <button
                                onClick={() => window.open(`/invoice/${inv.id}/print?stationery=true`, '_blank')}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
                                title="Stationery PDF – View / Print / Save as PDF (No Header/Footer)"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6 text-xs text-slate-500">
                    <div>
                      Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'clients' && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Clients List</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Showing {clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase().trim())).length} of {clients.length} entries</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="Search client name or email..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white w-60"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                        <th className="py-4 px-4">Client Name</th>
                        <th className="py-4 px-4">Email</th>
                        <th className="py-4 px-4">State / Supply Region</th>
                        <th className="py-4 px-4">GSTIN</th>
                        <th className="py-4 px-4">Billing Address</th>
                        <th className="py-4 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {clients
                        .filter(c => {
                          const query = clientSearchQuery.toLowerCase().trim();
                          return query === '' || c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
                        })
                        .map((client) => {
                          const isExport = !client.stateCode || client.stateCode === '00' || client.state.toLowerCase().includes('export') || client.state.toLowerCase().includes('foreign');
                          return (
                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                              <td className="py-4 px-4 font-bold text-slate-800">{client.name}</td>
                              <td className="py-4 px-4 text-slate-600 text-xs">{client.email}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isExport
                                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                  {client.state} {isExport && '(Export)'}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono text-xs text-slate-500">{client.gstin || 'N/A'}</td>
                              <td className="py-4 px-4 text-slate-500 text-xs max-w-[200px] truncate" title={client.address}>
                                {client.address || 'N/A'}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditClient(client)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded border border-red-100 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}



            {activeTab === 'settings' && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-300">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Business & App Settings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Configure your company identity, default bank remittance profiles, and numbering prefix settings.</p>
                </div>

                {settingsSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-semibold">
                    {settingsSuccess}
                  </div>
                )}

                {settingsError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                    {settingsError}
                  </div>
                )}

                <form onSubmit={handleSettingsSubmit} className="space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 border border-slate-200 rounded-2xl">
                    {/* Identity */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Identity</h3>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Business Name</label>
                        <input
                          type="text"
                          required
                          value={settings.business_name || ''}
                          onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Registered Address (HTML Allowed)</label>
                        <textarea
                          rows="3"
                          value={settings.business_address || ''}
                          onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Extra Business Info (PAN, GST, CIN, etc.)</label>
                        <textarea
                          rows="3"
                          value={settings.business_extra_info || ''}
                          onChange={(e) => setSettings({ ...settings, business_extra_info: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">LUT ARN Number (Exports)</label>
                        <input
                          type="text"
                          value={settings.business_lut_arn || ''}
                          onChange={(e) => setSettings({ ...settings, business_lut_arn: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                        />
                      </div>
                    </div>

                    {/* Bank details & defaults */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remittances & Invoicing Defaults</h3>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Domestic Bank Details (ICICI, etc.)</label>
                        <textarea
                          rows="3"
                          value={settings.business_bank_detail || ''}
                          onChange={(e) => setSettings({ ...settings, business_bank_detail: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Prefix</label>
                          <input
                            type="text"
                            value={settings.invoice_prefix || ''}
                            onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Next Number</label>
                          <input
                            type="text"
                            value={settings.invoice_next_number || ''}
                            onChange={(e) => setSettings({ ...settings, invoice_next_number: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Default Terms & Conditions / Footer</label>
                        <textarea
                          rows="3"
                          value={settings.invoice_footer || ''}
                          onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                          className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ⚡ Quick Service Presets Management Card */}
                  <div className="border-t border-slate-200 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="text-[#E94444]">⚡</span> Quick Service Presets Management
                        </h3>
                        <p className="text-xs text-slate-500">
                          Add, remove, or edit pre-defined HSN/SAC & Item Title presets for invoice line items.
                        </p>
                      </div>
                    </div>

                    {/* Current Presets List */}
                    <div className="space-y-2 mb-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      {servicePresetsList.map((preset, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[#E94444] bg-[#F5F3EA] px-2 py-0.5 rounded border border-[#E94444]/20">
                              {preset.hsnSac}
                            </span>
                            <span className="font-semibold text-slate-800">{preset.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = servicePresetsList.filter((_, i) => i !== idx);
                              setSettings(prev => ({ ...prev, service_presets: JSON.stringify(updated) }));
                            }}
                            className="text-slate-400 hover:text-red-500 font-bold px-2 py-1 transition-colors text-sm"
                            title="Remove preset"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Preset Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 border border-slate-200 rounded-xl items-end shadow-sm">
                      <div className="sm:col-span-3">
                        <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">HSN/SAC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. 998316"
                          value={newPresetHsn}
                          onChange={(e) => setNewPresetHsn(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono outline-none text-slate-800 focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Service Title / Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Mobile App Development Services"
                          value={newPresetTitle}
                          onChange={(e) => setNewPresetTitle(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none text-slate-800 focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444]"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!newPresetHsn.trim() || !newPresetTitle.trim()) return;
                            const label = `${newPresetHsn.trim()} - ${newPresetTitle.trim()}`;
                            const newEntry = { hsnSac: newPresetHsn.trim(), title: newPresetTitle.trim(), label };
                            const updated = [...servicePresetsList, newEntry];
                            setSettings(prev => ({ ...prev, service_presets: JSON.stringify(updated) }));
                            setNewPresetHsn('');
                            setNewPresetTitle('');
                          }}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                        >
                          + Add New Preset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 bg-[#E94444] hover:bg-[#d63a3a] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors shadow"
                    >
                      {isSavingSettings ? 'Saving Settings...' : 'Save All Settings'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeTab === 'settings' && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-300 mt-6">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#E94444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Security Settings
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Change your administrator password.</p>
                </div>

                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-semibold">
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-6 w-full max-w-md">
                  <div className="space-y-4 bg-slate-50/50 p-6 border border-slate-200 rounded-2xl">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors shadow"
                    >
                      {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl relative animate-scale-up overflow-hidden max-h-[92vh] flex flex-col">

                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Invoice Details
                        <span className="text-sm font-mono text-[#E94444] font-bold px-2.5 py-0.5 bg-[#F5F3EA] rounded-lg border border-[#E94444]/20">
                          {selectedInvoice.invoiceNumber}
                        </span>
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="text-slate-400 hover:text-slate-600 text-2xl font-semibold p-1"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="overflow-y-auto pr-1 flex-1 space-y-6 text-sm">

                    {/* Meta details */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-50/80 p-5 border border-slate-200/80 rounded-2xl">
                      <div>
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Billing Client</div>
                        <div className="font-bold text-slate-900 text-base">{selectedInvoice.client?.name}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{selectedInvoice.client?.email}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">GSTIN: {selectedInvoice.client?.gstin || 'N/A'}</div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">Address: {selectedInvoice.client?.address || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Invoice Info</div>
                        <div className="text-slate-700">
                          Order No: <span className="font-bold text-slate-900">{selectedInvoice.orderNumber || 'N/A'}</span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          Supply Region: <span className="font-semibold text-slate-800">{selectedInvoice.client?.state} ({selectedInvoice.domesticExport})</span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          Date Created: <span className="font-medium text-slate-800">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                        </div>
                        {selectedInvoice.dueDate && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            Due Date: <span className="font-medium text-slate-800">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Line Items */}
                    <div>
                      <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-3">Line Items</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider">
                              <th className="py-3 px-4">HSN/SAC</th>
                              <th className="py-3 px-4">Item & Description</th>
                              <th className="py-3 px-4 text-center">Qty</th>
                              <th className="py-3 px-4 text-right">Rate</th>
                              <th className="py-3 px-4 text-right">Adj %</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {selectedInvoice.lineItems?.map((item) => (
                              <tr key={item.id} className="text-slate-700 hover:bg-slate-50/50">
                                <td className="py-3.5 px-4 font-mono text-slate-500">{item.hsnSac || '998314'}</td>
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">{item.title}</div>
                                  {item.description && (
                                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center font-semibold">{item.quantity}</td>
                                <td className="py-3.5 px-4 text-right font-medium">{getCurrencySymbol(selectedInvoice)}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3.5 px-4 text-right text-slate-500">{item.adjustPercent}%</td>
                                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                  {getCurrencySymbol(selectedInvoice)}{((item.quantity * item.amount) * (1 - (item.adjustPercent || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Math Summary */}
                    <div className="border-t border-slate-100 pt-6 flex justify-end">
                      <div className="w-72 space-y-2.5 text-sm bg-slate-50/80 p-4 border border-slate-200 rounded-2xl">
                        <div className="flex justify-between text-slate-600 font-medium">
                          <span>Subtotal</span>
                          <span className="font-semibold text-slate-900">
                            {getCurrencySymbol(selectedInvoice)}{selectedInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {selectedInvoice.cgst > 0 && (
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>CGST @ 9%</span>
                            <span className="font-semibold text-slate-900">
                              + {getCurrencySymbol(selectedInvoice)}{selectedInvoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {selectedInvoice.sgst > 0 && (
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>SGST @ 9%</span>
                            <span className="font-semibold text-slate-900">
                              + {getCurrencySymbol(selectedInvoice)}{selectedInvoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {selectedInvoice.igst > 0 && (
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>IGST @ 18%</span>
                            <span className="font-semibold text-slate-900">
                              + {getCurrencySymbol(selectedInvoice)}{selectedInvoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {selectedInvoice.discount > 0 && (
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>Discount</span>
                            <span className="font-semibold text-red-600">
                              - {getCurrencySymbol(selectedInvoice)}{selectedInvoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-bold text-[#E94444]">
                          <span>Grand Total</span>
                          <span>
                            {getCurrencySymbol(selectedInvoice)}{selectedInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Modal Footer (Organized Actions for Full vs Stationery) */}
                  <div className="border-t border-slate-200 pt-4 mt-6 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex gap-2">

                      <button
                        onClick={() => handleStartEditInvoice(selectedInvoice)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Full PDF icon button */}
                      <button
                        onClick={() => window.open(`/invoice/${selectedInvoice.id}/print`, '_blank')}
                        className="p-2 bg-[#F5F3EA] text-[#E94444] hover:bg-[#E94444]/10 rounded-lg border border-[#E94444]/20 transition-all"
                        title="Full PDF – View / Print / Save as PDF (With Header & Footer)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </button>
                      {/* Stationery PDF icon button */}
                      <button
                        onClick={() => window.open(`/invoice/${selectedInvoice.id}/print?stationery=true`, '_blank')}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
                        title="Stationery PDF – View / Print / Save as PDF (No Header/Footer)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Create Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl relative animate-scale-up overflow-hidden max-h-[90vh] flex flex-col">

            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-800">{clientForm.id ? 'Edit Client' : 'Add New Client'}</h3>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleClientSubmit} className="overflow-y-auto pr-1 flex-1 space-y-4 text-sm">
              {clientFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
                  {clientFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name (Contact)</label>
                  <input
                    type="text"
                    value={clientForm.firstName || ''}
                    onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                    placeholder="e.g. Mr. Abi"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name (Contact)</label>
                  <input
                    type="text"
                    value={clientForm.lastName || ''}
                    onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                    placeholder="e.g. Ali"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company / Business Name</label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="e.g. ABIARTFOLIO"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="e.g. kaizad.m@unisonglobus.com"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StateSearchCombobox
                  selectedState={clientForm.state}
                  onSelectState={(stateName, stateCode) => {
                    setClientForm({ ...clientForm, state: stateName, stateCode });
                  }}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State Code</label>
                  <input
                    type="text"
                    required
                    value={clientForm.stateCode}
                    onChange={(e) => setClientForm({ ...clientForm, stateCode: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client GSTIN</label>
                <input
                  type="text"
                  value={clientForm.gstin}
                  onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 24AAJFU0296R1ZG"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Billing Address</label>
                <textarea
                  rows="3"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  placeholder="Full Address line"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="px-4 py-2 bg-[#E94444] hover:bg-[#d63a3a] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {isSubmittingClient ? 'Saving...' : (clientForm.id ? 'Update Client' : 'Save Client')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full p-6 shadow-xl relative animate-scale-up overflow-hidden max-h-[95vh] flex flex-col">

            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-800">{invoiceForm.id ? 'Edit Invoice' : 'Add New Invoice'}</h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="overflow-y-auto pr-1 flex-1 space-y-6 text-sm">
              {invoiceFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
                  {invoiceFormError}
                </div>
              )}

              {/* Meta options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-0948"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Order / Serial ID (PDF header)</label>
                  <input
                    type="text"
                    value={invoiceForm.orderNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, orderNumber: e.target.value })}
                    placeholder="e.g. D2026270616"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 font-mono bg-white"
                  />
                </div>

                <ClientSearchCombobox
                  clients={clients}
                  selectedClientId={invoiceForm.clientId}
                  onSelectClient={(clientId) => {
                    handleClientSelectInInvoice(clientId);
                  }}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supply Region</label>
                  <select
                    value={invoiceForm.domesticExport}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, domesticExport: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                  >
                    <option value="Domestic">Domestic</option>
                    <option value="Export">Export (USD Remittance details)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax Rule (GST)</label>
                  <select
                    value={invoiceForm.taxRule}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRule: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                  >
                    <option value="Auto">Auto (Based on State)</option>
                    <option value="IGST">Force IGST (18%)</option>
                    <option value="CGST_SGST">Force CGST & SGST (9% + 9%)</option>
                    <option value="None">No Tax / Exempt (0%)</option>
                  </select>
                </div>

                {invoiceForm.domesticExport === 'Export' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LUT ARN Number (Snapshot)</label>
                    <input
                      type="text"
                      value={invoiceForm.lutArn || ''}
                      placeholder={settings.business_lut_arn || 'AD241225020914E'}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, lutArn: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white font-mono text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                  <select
                    value={invoiceForm.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      const symbol = currency === 'USD' ? '$' : '₹';
                      const supply = currency === 'USD' ? 'Export' : invoiceForm.domesticExport;
                      setInvoiceForm({ ...invoiceForm, currency, currencySymbol: symbol, domesticExport: supply });
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                  >
                    <option value="INR">INR - Indian Rupee (₹)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Status</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setInvoiceForm(prev => {
                        let newOrderNo = prev.orderNumber;
                        if (newStatus === 'DRAFT') {
                          newOrderNo = '';
                        } else if ((!newOrderNo || prev.status === 'DRAFT') && newStatus !== 'CANCELLED') {
                          newOrderNo = generateOrderNumber(newStatus, prev.domesticExport);
                        }
                        return { ...prev, status: newStatus, orderNumber: newOrderNo };
                      });
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white font-medium"
                  >
                    <option value="TAX INVOICE">TAX INVOICE</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                    <option value="PROFORMA">PROFORMA</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Line Items builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wide">Line Items</h4>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs text-[#E94444] hover:text-[#d63a3a] font-bold"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-4">
                  {invoiceForm.lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={invoiceForm.lineItems.length === 1}
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-500 disabled:opacity-30 text-lg font-bold"
                      >
                        &times;
                      </button>

                      <div className="mb-2">
                        <label className="block text-xxs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[#E94444]">
                            ⚡ Quick Service Preset
                          </span>
                          <span className="text-slate-400 text-[10px] lowercase font-normal">
                            (select option to auto-fill HSN & Title)
                          </span>
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const selected = servicePresetsList.find(p => p.hsnSac === val || p.label === val);
                            if (selected) {
                              handleLineItemChange(index, 'hsnSac', selected.hsnSac);
                              handleLineItemChange(index, 'title', selected.title);
                            }
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none"
                          defaultValue=""
                        >
                          <option value="">-- Choose Service Preset ({servicePresetsList.map(p => p.hsnSac).join(', ')}) --</option>
                          {servicePresetsList.map((preset, pIdx) => (
                            <option key={pIdx} value={preset.hsnSac}>
                              {preset.label || `${preset.hsnSac} - ${preset.title}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">HSN/SAC</label>
                          <input
                            type="text"
                            required
                            placeholder="998314"
                            value={item.hsnSac}
                            onChange={(e) => handleLineItemChange(index, 'hsnSac', e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white font-mono"
                          />
                        </div>

                        <div className="col-span-9">
                          <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">Item Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Web Development Services"
                            value={item.title}
                            onChange={(e) => handleLineItemChange(index, 'title', e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">Description</label>
                        <textarea
                          rows="2"
                          placeholder="Detailed description of the services..."
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">Qty / Hrs</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-center"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">Rate ({invoiceForm.currencySymbol})</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={item.amount}
                            onChange={(e) => handleLineItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-right"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-xxs font-bold text-slate-400 uppercase mb-0.5">Adjust (%)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            step="any"
                            value={item.adjustPercent}
                            onChange={(e) => handleLineItemChange(index, 'adjustPercent', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white text-center"
                          />
                        </div>

                        <div className="col-span-1 flex flex-col justify-end text-right">
                          <span className="text-xxs font-bold text-slate-400 uppercase">Subtotal</span>
                          <span className="text-sm font-semibold text-slate-700 py-1.5">
                            {invoiceForm.currencySymbol}{((item.quantity || 0) * (item.amount || 0) * (1 - (item.adjustPercent || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Section */}
              <div className="border-t border-slate-200 pt-6 grid grid-cols-12 gap-4">
                {/* Left Notes */}
                <div className="col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Global Discount ({invoiceForm.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: parseFloat(e.target.value) || 0 })}
                    className="w-48 p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#E94444]/20 focus:border-[#E94444] outline-none text-slate-800"
                  />
                </div>

                {/* Calculations Math Summary */}
                <div className="col-span-6 flex justify-end">
                  <div className="w-64 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">
                        {invoiceForm.currencySymbol}{formTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {invoiceForm.clientId && (
                      <>
                        {formTotals.cgst > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>CGST @ 9%</span>
                            <span className="font-semibold text-slate-800">
                              + {invoiceForm.currencySymbol}{formTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {formTotals.sgst > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>SGST @ 9%</span>
                            <span className="font-semibold text-slate-800">
                              + {invoiceForm.currencySymbol}{formTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {formTotals.igst > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>IGST @ 18%</span>
                            <span className="font-semibold text-slate-800">
                              + {invoiceForm.currencySymbol}{formTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {parseFloat(invoiceForm.discount) > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Discount</span>
                        <span className="font-semibold text-red-500">
                          - {invoiceForm.currencySymbol}{(parseFloat(invoiceForm.discount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-[#E94444]">
                      <span>Grand Total</span>
                      <span>
                        {invoiceForm.currencySymbol}{formTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit actions */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Calculations automatically split regional GST for Zero Designs (Gujarat).
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvoice}
                    className="px-4 py-2 bg-[#E94444] hover:bg-[#d63a3a] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmittingInvoice ? 'Saving...' : (invoiceForm.id ? 'Update Invoice' : 'Save Invoice')}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* In-App Professional PDF Viewer Modal */}
      {pdfViewerInvoice && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-md animate-fade-in">
          {/* Dark Toolbar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shadow-lg">
            {/* Info */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E94444]/20 text-[#E94444] rounded-lg border border-[#E94444]/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  {(() => {
                    const client = (pdfViewerInvoice.client?.name || 'CLIENT')
                      .toUpperCase()
                      .trim()
                      .replace(/[^A-Z0-9]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');

                    const date = new Date(pdfViewerInvoice?.createdAt || new Date());
                    const century = String(date.getFullYear()).slice(0, 2);
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');

                    const fiscalMonth = date.getMonth();
                    const startYear = fiscalMonth >= 3 ? date.getFullYear() : date.getFullYear() - 1;
                    const endYear = startYear + 1;
                    const startYearShort = String(startYear).slice(-2);
                    const endYearShort = String(endYear).slice(-2);
                    const fy = `${startYearShort}${endYearShort}`;

                    let prefix = 'D';
                    if (pdfViewerInvoice?.status === 'PROFORMA') {
                      prefix = pdfViewerInvoice?.domesticExport === 'Export' ? 'PE' : 'PD';
                    } else {
                      prefix = pdfViewerInvoice?.domesticExport === 'Export' ? 'E' : 'D';
                    }
                    const generatedId = `${prefix}${century}${fy}${month}${day}`;

                    return `${generatedId}-${client}.pdf`;
                  })()}
                </h3>
                <p className="text-xs text-slate-400">
                  PDF Document Preview • Page 1 of 1
                </p>
              </div>
            </div>

            {/* Mode Toggle Switch */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPdfViewerStationery(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${!pdfViewerStationery
                  ? 'bg-[#E94444] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Full PDF (With Header/Footer)
              </button>
              <button
                type="button"
                onClick={() => setPdfViewerStationery(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${pdfViewerStationery
                  ? 'bg-[#E94444] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                Stationery (No Header/Footer)
              </button>
            </div>

            {/* Zoom & Action Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => setPdfZoom(prev => Math.max(50, prev - 10))}
                  className="px-1 hover:text-white font-bold text-base"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="px-2 font-mono text-slate-200">{pdfZoom}%</span>
                <button
                  type="button"
                  onClick={() => setPdfZoom(prev => Math.min(150, prev + 10))}
                  className="px-1 hover:text-white font-bold text-base"
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              {/* Print PDF */}
              <button
                type="button"
                onClick={() => {
                  const printUrl = `/invoice/${pdfViewerInvoice.id}/print?print=true${pdfViewerStationery ? '&stationery=true' : ''}`;
                  window.open(printUrl, '_blank');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                title="Print PDF"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 0 1-2.25 2.25H8.59A2.25 2.25 0 0 1 6.34 18m11.318-4.085c.675-.101 1.258-.456 1.635-1.045A5.633 5.633 0 0 0 19.5 9.75V9A6 6 0 0 0 7.5 9v.75c0 1.218-.386 2.372-1.045 3.42-.377.589-.96 1.044-1.635 1.045m14.496-4.085a12.044 12.044 0 0 1-14.496 0M9 7.5h6" />
                </svg>
                Print
              </button>

              {/* Download PDF */}
              <button
                type="button"
                onClick={() => {
                  const downloadUrl = `/invoice/${pdfViewerInvoice.id}/print?download=true${pdfViewerStationery ? '&stationery=true' : ''}`;
                  window.open(downloadUrl, '_blank');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                title="Download .PDF File"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download .pdf
              </button>

              {/* Close Viewer */}
              <button
                type="button"
                onClick={() => setPdfViewerInvoice(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all ml-2"
              >
                Close
              </button>
            </div>
          </div>

          {/* Document Frame */}
          <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex justify-center items-start">
            <div
              className="bg-white shadow-2xl transition-transform duration-200 origin-top rounded-sm overflow-hidden"
              style={{ transform: `scale(${pdfZoom / 100})` }}
            >
              <iframe
                src={`/invoice/${pdfViewerInvoice.id}/print?print=false${pdfViewerStationery ? '&stationery=true' : ''}`}
                className="w-[850px] h-[1150px] border-0"
                title="In-App PDF Viewer Document"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation & Alert Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-start gap-4">
              {/* Icon based on modalConfig.type */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${modalConfig.type === 'danger'
                ? 'bg-red-50 text-red-600 border border-red-100'
                : modalConfig.type === 'warning'
                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                  : modalConfig.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                {modalConfig.type === 'danger' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                )}
                {modalConfig.type === 'warning' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {modalConfig.type === 'success' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {modalConfig.type === 'info' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
                  {modalConfig.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {modalConfig.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-8 border-t border-slate-100 pt-5">
              {!modalConfig.isAlert && (
                <button
                  onClick={closeModalConfig}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                >
                  {modalConfig.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={async () => {
                  const fn = modalConfig.onConfirm;
                  closeModalConfig();
                  if (fn) await fn();
                }}
                className={`px-5 py-2 text-white font-semibold text-xs rounded-xl shadow-sm transition-all ${modalConfig.type === 'danger'
                  ? 'bg-[#E94444] hover:bg-[#d63a3a]'
                  : modalConfig.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {modalConfig.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
