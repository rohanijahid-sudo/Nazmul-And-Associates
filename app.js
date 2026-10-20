// NAZMUL & ASSOCIATES - ADAPTIVE RESPONSIVE ENGINE

function getCleanArray(val) {
  if (Array.isArray(val) && val.length > 0) return val;
  if (val && Array.isArray(val.value) && val.value.length > 0) return val.value;
  return [];
}

const initialSource = window.APP_INITIAL_DATA || {};

// Master State
let state = {
  settings: initialSource.settings || {
    firmName: "NAZMUL & ASSOCIATES",
    tagline: "TAX VAT Individual & Corporate Consultancy",
    address: "Saiham Sky View Tower, Level 15-D, Bijoy Nagar, Dhaka-1000",
    mobile: "+880 1898891224, +880 1898891220",
    assessmentYear: "2026-27",
    incomeYear: "1 July 2025 - 30 June 2026",
    employees: ["Sisir", "Jahid", "Rahman", "Milon & Sobuj", "Manna"]
  },
  clients: getCleanArray(initialSource.clients),
  tracker: getCleanArray(initialSource.tracker),
  documents: getCleanArray(initialSource.documents),
  currentTab: 'dashboard',
  clientTab: 'active',
  trackerFilter: 'All',
  trackerEmployeeFilter: 'All',
  selectedFileForSMS: 'F-130',
  currentEditingFile: null,
  searchQuery: ''
};

// Check if localStorage has valid updated data
try {
  const saved = localStorage.getItem('NA_TAX_MOBILE_FINAL');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.clients && parsed.clients.length >= 100) {
      state.clients = parsed.clients;
      if (parsed.tracker && parsed.tracker.length > 0) state.tracker = parsed.tracker;
      if (parsed.documents && parsed.documents.length > 0) state.documents = parsed.documents;
      if (parsed.settings) state.settings = parsed.settings;
    }
  }
} catch (err) {
  console.warn("Storage check notice:", err);
}

// Guarantee default selected file exists
if (state.tracker.length > 0) {
  const hasF130 = state.tracker.some(t => t.fileNo === 'F-130');
  state.selectedFileForSMS = hasF130 ? 'F-130' : state.tracker[0].fileNo;
} else if (state.clients.length > 0) {
  const firstWithFile = state.clients.find(c => c.fileNo);
  state.selectedFileForSMS = firstWithFile ? firstWithFile.fileNo : 'F-001';
}

// RUN ON LOAD
document.addEventListener('DOMContentLoaded', () => {
  renderHeaderMeta();
  renderDashboardView();
  renderTrackerView();
  renderClientsView();
  renderDocumentsView();
  populateRequisitionDropdown();
  renderMobileRequisition(state.selectedFileForSMS);
});

function persistState() {
  try {
    localStorage.setItem('NA_TAX_MOBILE_FINAL', JSON.stringify({
      settings: state.settings,
      clients: state.clients,
      tracker: state.tracker,
      documents: state.documents
    }));
  } catch (e) {
    console.error("Save state failed", e);
  }
}

// -------------------------------------------------------------
// 1. TOP HEADER & METRICS
// -------------------------------------------------------------
function renderHeaderMeta() {
  const ayEl = document.getElementById('headerAY');
  const countEl = document.getElementById('headerClientCount');
  if (ayEl) ayEl.textContent = state.settings.assessmentYear || '2026-27';
  if (countEl) countEl.textContent = `${state.clients.length} জন ক্লায়েন্ট`;

  const deskTrkBadge = document.getElementById('deskBadgeTracker');
  const deskClBadge = document.getElementById('deskBadgeClients');
  if (deskTrkBadge) deskTrkBadge.textContent = state.tracker.length;
  if (deskClBadge) deskClBadge.textContent = state.clients.length;
}

// -------------------------------------------------------------
// 2. ADAPTIVE TAB SWITCHER (DESKTOP TOP TABS + MOBILE BOTTOM DOCK)
// -------------------------------------------------------------
function switchTab(tabId) {
  state.currentTab = tabId;

  // Toggle views
  document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');

  const tabList = ['dashboard', 'tracker', 'clients', 'documents', 'requisition'];

  // Update Desktop Top Tabs
  tabList.forEach(t => {
    const dBtn = document.getElementById(`deskTab-${t}`);
    if (!dBtn) return;
    if (t === tabId) {
      dBtn.className = "desk-nav-btn active px-4 py-2 rounded-xl bg-sky-50 text-sky-700 transition flex items-center space-x-2 font-black";
    } else {
      dBtn.className = "desk-nav-btn px-4 py-2 rounded-xl hover:bg-slate-100 transition flex items-center space-x-2 font-bold text-slate-600";
    }
  });

  // Update Mobile Bottom Dock
  tabList.forEach(t => {
    const mBtn = document.getElementById(`nav-${t}`);
    const wrap = document.getElementById(`iconWrap-${t}`);
    if (!mBtn || !wrap) return;

    if (t === tabId) {
      wrap.className = "w-9 h-7 rounded-xl flex items-center justify-center bg-sky-50 text-sky-600 transition-all scale-105";
      mBtn.querySelector('span').className = "text-[10px] font-extrabold mt-0.5 tracking-tight text-sky-700";
      const svg = wrap.querySelector('svg');
      if (svg) svg.className = "w-5 h-5 text-sky-600";
    } else {
      wrap.className = "w-9 h-7 rounded-xl flex items-center justify-center text-slate-400 transition-all";
      mBtn.querySelector('span').className = "text-[10px] font-bold mt-0.5 tracking-tight text-slate-400";
      const svg = wrap.querySelector('svg');
      if (svg) svg.className = "w-5 h-5 text-slate-400";
    }
  });

  if (tabId === 'requisition') {
    renderMobileRequisition(state.selectedFileForSMS);
  }
}

// -------------------------------------------------------------
// 3. DASHBOARD & 1-TAP WHATSAPP REQUISITION
// -------------------------------------------------------------
function renderDashboardView() {
  const activeCount = state.clients.filter(c => c.category === 'Active').length;
  const irregularCount = state.clients.filter(c => c.category === 'Irregular').length;
  const pendingCount = state.tracker.filter(t => t.status !== 'Submitted' && t.status !== 'File Close').length;
  const submittedCount = state.tracker.filter(t => t.status === 'Submitted' || t.status === 'File Close').length;

  document.getElementById('kpiActiveFiles').textContent = activeCount;
  document.getElementById('kpiIrregularFiles').textContent = irregularCount;
  document.getElementById('kpiPendingWork').textContent = pendingCount;
  document.getElementById('kpiSubmittedFiles').textContent = submittedCount;

  populateQuickFileDropdown();
  updateQuickSMSPreview(state.selectedFileForSMS);
  renderWorkloadTiles();
}

function getAllFilesList() {
  const fileMap = new Map();

  // 1. First add from tracker
  state.tracker.forEach(t => {
    if (t.fileNo) {
      fileMap.set(t.fileNo, {
        fileNo: t.fileNo,
        clientName: t.clientName || 'ক্লায়েন্ট',
        assignedTo: t.assignedTo || ''
      });
    }
  });

  // 2. Add from client list if not already present
  state.clients.forEach(c => {
    if (c.fileNo && !fileMap.has(c.fileNo)) {
      fileMap.set(c.fileNo, {
        fileNo: c.fileNo,
        clientName: c.clientName || 'ক্লায়েন্ট',
        assignedTo: c.assignedTo || ''
      });
    }
  });

  return Array.from(fileMap.values()).sort((a, b) => {
    return a.fileNo.localeCompare(b.fileNo, undefined, { numeric: true });
  });
}

function populateQuickFileDropdown() {
  const select = document.getElementById('quickFileSelect');
  if (!select) return;

  const allFiles = getAllFilesList();
  let html = '';

  allFiles.forEach(f => {
    const isSelected = f.fileNo === state.selectedFileForSMS ? 'selected' : '';
    html += `<option value="${f.fileNo}" ${isSelected}>${f.fileNo} • ${f.clientName}</option>`;
  });

  select.innerHTML = html;
}

function handleQuickFileChange(fileNo) {
  state.selectedFileForSMS = fileNo;
  updateQuickSMSPreview(fileNo);

  const reqSel = document.getElementById('mobileReqSelector');
  if (reqSel) reqSel.value = fileNo;
}

function updateQuickSMSPreview(fileNo) {
  if (!fileNo) return;
  const client = state.clients.find(c => c.fileNo === fileNo) || {};
  const tracker = state.tracker.find(t => t.fileNo === fileNo) || {};
  const clientName = client.clientName || tracker.clientName || 'সম্মানিত ক্লায়েন্ট';

  document.getElementById('previewClientTitle').textContent = `${clientName} (${fileNo})`;

  const pendingDocs = state.documents.filter(d => d.fileNo === fileNo && d.status === 'Pending');
  const countBadge = document.getElementById('previewDocCount');
  const previewBox = document.getElementById('previewMissingList');

  if (pendingDocs.length > 0) {
    countBadge.textContent = `${pendingDocs.length}টি কাগজ বাকি`;
    countBadge.className = "font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-[10px] border border-rose-200";

    const docLines = pendingDocs.map((d, i) => `${i + 1}. ${d.category}${d.details ? ' (' + d.details + ')' : ''}`).join('\n');
    previewBox.textContent = `Dear ${clientName} (${fileNo}),\n\n` +
      `Please provide the following document(s) for your Income Tax Return (${state.settings.assessmentYear || '2026-27'}):\n` +
      `${docLines}\n\n` +
      `- ${state.settings.firmName || 'NAZMUL & ASSOCIATES'}`;
  } else {
    countBadge.textContent = `সব কাগজ রিসিভড ✓`;
    countBadge.className = "font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200";
    previewBox.textContent = `Dear ${clientName} (${fileNo}),\n\n` +
      `All required documents for your Income Tax Return have been received. Your file is under active preparation.\n\n` +
      `- ${state.settings.firmName || 'NAZMUL & ASSOCIATES'}`;
  }
}

function copyGeneratedMessage() {
  const text = document.getElementById('previewMissingList').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    alert("মেসেজ সফলভাবে কপি হয়েছে!");
  });
}

function sendQuickWhatsApp() {
  const text = document.getElementById('previewMissingList').textContent;
  if (!text) return;

  const fileNo = state.selectedFileForSMS;
  const client = state.clients.find(c => c.fileNo === fileNo);
  let phone = client?.contact || '';
  phone = phone.replace(/[^0-9]/g, '');
  if (phone.startsWith('01')) phone = '88' + phone;

  const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function renderWorkloadTiles() {
  const container = document.getElementById('mobileEmployeeList');
  if (!container) return;

  const employees = state.settings.employees || ["Sisir", "Jahid", "Rahman", "Milon & Sobuj", "Manna"];
  let html = '';

  employees.forEach(emp => {
    const empClients = state.clients.filter(c => c.assignedTo && c.assignedTo.includes(emp));
    const empTracker = state.tracker.filter(t => t.assignedTo && t.assignedTo.includes(emp));
    const pending = empTracker.filter(t => t.status !== 'Submitted' && t.status !== 'File Close').length;
    const done = empTracker.filter(t => t.status === 'Submitted').length;

    html += `
      <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
            ${emp.charAt(0)}
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-800 leading-none">${emp}</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">${empClients.length} ক্লায়েন্ট • ${empTracker.length} টি ফাইল</p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">${pending} পেন্ডিং</span>
          <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">${done} জমা</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// -------------------------------------------------------------
// 4. WORK TRACKER & FILTERS
// -------------------------------------------------------------
function filterTrackerByStatus(status) {
  state.trackerFilter = status;

  const map = {
    'All': 'btnTrkAll',
    'Waiting for Docs': 'btnTrkDocs',
    'Under Review': 'btnTrkReview',
    'Ready for Submit': 'btnTrkReady',
    'Submitted': 'btnTrkDone'
  };

  Object.keys(map).forEach(key => {
    const el = document.getElementById(map[key]);
    if (!el) return;
    if (key === status) {
      el.className = "tracker-filter-pill active px-3.5 py-1.5 rounded-full font-bold bg-sky-600 text-white whitespace-nowrap shadow-xs transition";
    } else {
      el.className = "tracker-filter-pill px-3 py-1.5 rounded-full font-semibold bg-white border border-slate-200 text-slate-700 whitespace-nowrap hover:bg-slate-50 transition";
    }
  });

  renderTrackerView();
}

function filterTrackerByEmployee(emp) {
  state.trackerEmployeeFilter = emp;
  renderTrackerView();
}

function renderTrackerView() {
  const container = document.getElementById('mobileTrackerCards');
  if (!container) return;

  const statusFilter = state.trackerFilter;
  const empFilter = state.trackerEmployeeFilter;
  const q = state.searchQuery.toLowerCase().trim();

  const items = state.tracker.filter(item => {
    let matchStatus = true;
    if (statusFilter === 'Waiting for Docs') matchStatus = item.status === 'Waiting for Docs';
    else if (statusFilter === 'Under Review') matchStatus = (item.status === 'Under Review' || item.status === 'Processing' || item.status === 'On Hold (Issue)');
    else if (statusFilter === 'Ready for Submit') matchStatus = item.status === 'Ready for Submit';
    else if (statusFilter === 'Submitted') matchStatus = item.status === 'Submitted';

    let matchEmp = true;
    if (empFilter && empFilter !== 'All') {
      matchEmp = item.assignedTo && item.assignedTo.includes(empFilter);
    }

    const matchSearch = !q ||
      (item.clientName && item.clientName.toLowerCase().includes(q)) ||
      (item.fileNo && item.fileNo.toLowerCase().includes(q)) ||
      (item.assignedTo && item.assignedTo.toLowerCase().includes(q));

    return matchStatus && matchEmp && matchSearch;
  });

  const countPill = document.getElementById('countPillAll');
  if (countPill) countPill.textContent = state.tracker.length;

  let html = '';
  if (items.length === 0) {
    html = `<div class="col-span-full p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">কোনো ফাইল পাওয়া যায়নি</div>`;
  } else {
    items.forEach(t => {
      const hasIssue = t.mainIssue && t.mainIssue !== 'No Issue';
      const badgeStyle = getStatusBadge(t.status);

      html += `
        <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-md transition space-y-2.5 flex flex-col justify-between">
          
          <div>
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-black text-sky-700 font-mono bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">${t.fileNo}</span>
                <span class="text-[11px] font-bold text-slate-600">${t.assignedTo || 'Unassigned'}</span>
              </div>
              
              <button onclick="openStatusPicker('${t.fileNo}', '${t.clientName}', '${t.status}')" class="text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 ${badgeStyle.class} active:scale-95 transition">
                <span>${t.status}</span>
                <svg class="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </button>
            </div>

            <div class="mt-2">
              <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-1">${t.clientName}</h4>
              ${hasIssue ? `
                <div class="mt-1 flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md w-fit border border-rose-200">
                  <span>⚠️ ${t.mainIssue}</span>
                </div>
              ` : ''}
            </div>

            ${t.remarks ? `
              <p class="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl leading-normal border border-slate-100 mt-2 line-clamp-2">${t.remarks}</p>
            ` : ''}
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span class="text-slate-500">TAT: <strong class="text-slate-800">${t.tat || t.daysActive || '-'}</strong> দিন</span>
            
            <div class="flex items-center space-x-1.5">
              <button onclick="directWhatsApp('${t.fileNo}')" title="WhatsApp রিকুইজিশন" class="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center active:scale-90 border border-emerald-200">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z"/></svg>
              </button>
              <button onclick="advanceTrackerStage('${t.fileNo}')" class="px-2.5 py-1 bg-sky-50 text-sky-700 font-extrabold rounded-lg text-[10px] flex items-center space-x-1 active:scale-95 border border-sky-100">
                <span>পরবর্তী ধাপ</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              </button>
            </div>
          </div>

        </div>
      `;
    });
  }

  container.innerHTML = html;
}

function getStatusBadge(status) {
  if (status === 'Submitted') return { class: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
  if (status === 'Under Review' || status === 'Processing') return { class: 'bg-sky-100 text-sky-800 border border-sky-200' };
  if (status === 'Waiting for Docs') return { class: 'bg-amber-100 text-amber-800 border border-amber-200' };
  if (status === 'Ready for Submit') return { class: 'bg-purple-100 text-purple-800 border border-purple-200' };
  return { class: 'bg-slate-100 text-slate-700 border border-slate-200' };
}

function advanceTrackerStage(fileNo) {
  const item = state.tracker.find(t => t.fileNo === fileNo);
  if (!item) return;

  if (item.status === 'Draft') item.status = 'Waiting for Docs';
  else if (item.status === 'Waiting for Docs') item.status = 'Under Review';
  else if (item.status === 'Under Review' || item.status === 'Processing') item.status = 'Ready for Submit';
  else if (item.status === 'Ready for Submit') item.status = 'Submitted';

  persistState();
  renderTrackerView();
  renderDashboardView();
}

// -------------------------------------------------------------
// 5. STATUS PICKER SHEET
// -------------------------------------------------------------
function openStatusPicker(fileNo, clientName, currentStatus) {
  state.currentEditingFile = fileNo;
  document.getElementById('sheetFileTitle').textContent = `ফাইল নং: ${fileNo}`;
  document.getElementById('sheetClientName').textContent = clientName;

  const statuses = ["Draft", "Waiting for Docs", "Processing", "Under Review", "Ready for Submit", "Submitted", "On Hold (Issue)"];
  let html = '';

  statuses.forEach(st => {
    const isSelected = st === currentStatus;
    html += `
      <button onclick="selectStatus('${st}')" class="w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${isSelected ? 'border-sky-600 bg-sky-50 text-sky-700 font-black' : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'}">
        <span>${st}</span>
        ${isSelected ? '<span class="text-sky-600 font-black text-sm">✓</span>' : ''}
      </button>
    `;
  });

  document.getElementById('sheetStatusOptions').innerHTML = html;
  document.getElementById('statusPickerSheet').classList.remove('hidden');
}

function selectStatus(newStatus) {
  if (state.currentEditingFile) {
    const item = state.tracker.find(t => t.fileNo === state.currentEditingFile);
    if (item) {
      item.status = newStatus;
      persistState();
      renderTrackerView();
      renderDashboardView();
    }
  }
  closeStatusSheet();
}

function closeStatusSheet() {
  document.getElementById('statusPickerSheet').classList.add('hidden');
}

// -------------------------------------------------------------
// 6. CLIENTS VIEW & ON-DEMAND ACTIVATION
// -------------------------------------------------------------
function setClientDirectoryTab(tab) {
  state.clientTab = tab;
  const btnA = document.getElementById('tabBtnClientActive');
  const btnI = document.getElementById('tabBtnClientIrregular');
  const noticeBox = document.getElementById('irregularNoticeBox');

  if (tab === 'active') {
    btnA.className = "py-2 px-4 rounded-lg bg-white text-sky-700 shadow-xs transition";
    btnI.className = "py-2 px-4 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center space-x-1";
    noticeBox.classList.add('hidden');
  } else {
    btnI.className = "py-2 px-4 rounded-lg bg-amber-500 text-white shadow-xs transition flex items-center justify-center space-x-1";
    btnA.className = "py-2 px-4 rounded-lg text-slate-600 hover:text-slate-900 transition";
    noticeBox.classList.remove('hidden');
  }

  renderClientsView();
}

function renderClientsView() {
  const container = document.getElementById('mobileClientCards');
  if (!container) return;

  const isIrregular = state.clientTab === 'irregular';
  const q = state.searchQuery.toLowerCase().trim();

  const activeCount = state.clients.filter(c => c.category === 'Active').length;
  const irregularCount = state.clients.filter(c => c.category === 'Irregular').length;

  document.getElementById('badgeActiveCount').textContent = activeCount;
  document.getElementById('badgeIrregularCount').textContent = irregularCount;

  const items = state.clients.filter(c => {
    const matchCategory = isIrregular ? (c.category === 'Irregular') : (c.category === 'Active');
    const matchSearch = !q ||
      (c.clientName && c.clientName.toLowerCase().includes(q)) ||
      (c.fileNo && c.fileNo.toLowerCase().includes(q)) ||
      (c.contact && c.contact.includes(q)) ||
      (c.tin && c.tin.includes(q));
    return matchCategory && matchSearch;
  });

  let html = '';
  if (items.length === 0) {
    html = `<div class="col-span-full p-10 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">কোনো ক্লায়েন্ট পাওয়া যায়নি</div>`;
  } else {
    items.forEach(c => {
      html += `
        <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-md transition space-y-2.5 flex flex-col justify-between">
          
          <div>
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span class="text-xs font-mono font-black ${c.fileNo ? 'text-sky-700 bg-sky-50 border border-sky-100' : 'text-slate-400 bg-slate-100'} px-2 py-0.5 rounded-md">
                ${c.fileNo || 'ফাইল নং নেই'}
              </span>
              <span class="text-[10px] font-bold ${c.assignedTo ? 'text-slate-700 bg-slate-100' : 'text-amber-800 bg-amber-100 border border-amber-200'} px-2 py-0.5 rounded-full">
                ${c.assignedTo || 'Unassigned'}
              </span>
            </div>

            <div class="mt-2">
              <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-1">${c.clientName}</h4>
              <div class="text-[11px] text-slate-500 space-y-0.5 mt-1">
                <p>ই-টিন: <span class="font-mono text-slate-800 font-semibold">${c.tin || '-'}</span></p>
                <p class="truncate">${c.zone || 'Zone N/A'} ${c.circle ? '• ' + c.circle : ''}</p>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              ${c.contact ? `
                <a href="tel:${c.contact}" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold flex items-center space-x-1 active:scale-95">
                  <span>📞 ${c.contact}</span>
                </a>
              ` : '<span class="text-[10px] text-slate-400">ফোন নম্বর নেই</span>'}
            </div>

            <div>
              ${isIrregular ? `
                <button onclick="mobileActivateIrregular(${c.id})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold rounded-xl text-[11px] shadow-sm flex items-center space-x-1">
                  <span>⚡ + এক ক্লিকে একটিভ</span>
                </button>
              ` : `
                <button onclick="directWhatsApp('${c.fileNo}')" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 flex items-center space-x-1">
                  <span>WhatsApp</span>
                </button>
              `}
            </div>
          </div>

        </div>
      `;
    });
  }

  container.innerHTML = html;
}

function mobileActivateIrregular(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const staff = prompt(`"${client.clientName}" ক্লায়েন্টটি অফিসে এসেছেন!\nকাকে দায়িত্ব দিতে চান? (Sisir, Jahid, Rahman, Milon & Sobuj, Manna):`, "Sisir");
  if (!staff) return;

  let assignedFileNo = client.fileNo;
  if (!assignedFileNo) {
    const nextNum = state.tracker.length + 1;
    assignedFileNo = `F-${String(nextNum).padStart(3, '0')}`;
    client.fileNo = assignedFileNo;
  }

  client.category = 'Active';
  client.assignedTo = staff;

  state.tracker.unshift({
    sl: String(state.tracker.length + 1),
    fileNo: assignedFileNo,
    clientName: client.clientName,
    assignedTo: staff,
    entryDate: new Date().toLocaleDateString(),
    deadline: '',
    status: 'Draft',
    mainIssue: 'No Issue',
    daysActive: '1',
    tat: 'Pending',
    remarks: 'Activated from Irregular pool upon client visit'
  });

  persistState();
  renderClientsView();
  renderTrackerView();
  renderDashboardView();
  populateRequisitionDropdown();
  renderHeaderMeta();

  alert(`ক্লায়েন্ট সফলভাবে একটিভ করা হয়েছে!\nফাইল নম্বর: ${assignedFileNo}\nদায়িত্বপ্রাপ্ত কর্মী: ${staff}`);
}

function directWhatsApp(fileNo) {
  switchTab('dashboard');
  handleQuickFileChange(fileNo);
  const sel = document.getElementById('quickFileSelect');
  if (sel) sel.value = fileNo;
  sendQuickWhatsApp();
}

// -------------------------------------------------------------
// 7. DOCUMENTS LOG
// -------------------------------------------------------------
function renderDocumentsView() {
  const container = document.getElementById('mobileDocList');
  if (!container) return;

  let html = '';
  state.documents.forEach((d, idx) => {
    const isPending = d.status === 'Pending';
    html += `
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-card flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="flex items-center space-x-1.5">
            <span class="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded">${d.fileNo}</span>
            <span class="text-xs font-bold text-slate-800">${d.category}</span>
          </div>
          <p class="text-[11px] text-slate-500">${d.clientName || 'ক্লায়েন্ট'} • ${d.details || 'সাধারণ রিকুইজিশন'}</p>
        </div>

        <button onclick="toggleMobileDoc(${idx})" class="px-3 py-1 rounded-xl text-xs font-extrabold transition active:scale-90 ${isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
          ${isPending ? '⏳ বাকি' : '✓ রিসিভড'}
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function toggleMobileDoc(idx) {
  if (state.documents[idx]) {
    state.documents[idx].status = state.documents[idx].status === 'Pending' ? 'Received' : 'Pending';
    persistState();
    renderDocumentsView();
    updateQuickSMSPreview(state.selectedFileForSMS);
    renderMobileRequisition(state.selectedFileForSMS);
  }
}

function openNewDocModal() {
  const fileNo = prompt("ফাইল নম্বর লিখুন (যেমন: F-130 বা F-001):", state.selectedFileForSMS || "F-130");
  if (!fileNo) return;

  const category = prompt("ডকুমেন্টের নাম লিখুন (Bank Statement, Salary Slip, Land Deed, GPF, ইত্যাদি):", "Bank Statement");
  if (!category) return;

  const details = prompt("অ্যাকাউন্ট নম্বর বা বিস্তারিত লিখুন (ঐচ্ছিক):", "");

  const client = state.clients.find(c => c.fileNo === fileNo);

  state.documents.unshift({
    sl: String(state.documents.length + 1),
    fileNo: fileNo,
    clientName: client?.clientName || "ক্লায়েন্ট",
    category: category,
    details: details || "",
    status: "Pending"
  });

  persistState();
  renderDocumentsView();
  updateQuickSMSPreview(fileNo);
  renderMobileRequisition(fileNo);
  alert("ডকুমেন্ট সফলভাবে যুক্ত হয়েছে!");
}

// -------------------------------------------------------------
// 8. PRINT REQUISITION
// -------------------------------------------------------------
function populateRequisitionDropdown() {
  const sel = document.getElementById('mobileReqSelector');
  if (!sel) return;

  const allFiles = getAllFilesList();
  let opts = '';

  allFiles.forEach(f => {
    const isSel = f.fileNo === state.selectedFileForSMS ? 'selected' : '';
    opts += `<option value="${f.fileNo}" ${isSel}>${f.fileNo} • ${f.clientName}</option>`;
  });

  sel.innerHTML = opts;
}

function renderMobileRequisition(fileNo) {
  if (!fileNo) fileNo = state.selectedFileForSMS || 'F-130';
  const client = state.clients.find(c => c.fileNo === fileNo) || {};
  const tracker = state.tracker.find(t => t.fileNo === fileNo) || {};

  document.getElementById('pFirmName').textContent = state.settings.firmName || 'NAZMUL & ASSOCIATES';
  document.getElementById('pFirmContact').textContent = `${state.settings.address || 'Bijoy Nagar, Dhaka'} • Mobile: ${state.settings.mobile || ''}`;

  document.getElementById('pDate').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('pClientName').textContent = client.clientName || tracker.clientName || '-';
  document.getElementById('pFileNo').textContent = fileNo;
  document.getElementById('pTIN').textContent = client.tin || '-';

  const docs = state.documents.filter(d => d.fileNo === fileNo);
  const tbody = document.getElementById('pDocTable');

  let html = '';
  if (docs.length === 0) {
    html = `
      <tr>
        <td class="p-2.5 text-center">1</td>
        <td class="p-2.5 font-bold">Bank Statement</td>
        <td class="p-2.5">সকল ব্যাংক হিসাবের ১ জুলাই হতে ৩০ জুন পর্যন্ত স্টেটমেন্ট</td>
        <td class="p-2.5 text-center text-amber-700 font-bold">Pending</td>
      </tr>
      <tr>
        <td class="p-2.5 text-center">2</td>
        <td class="p-2.5 font-bold">Salary / Income Slip</td>
        <td class="p-2.5">আয় ও বেতন বিবরণী</td>
        <td class="p-2.5 text-center text-amber-700 font-bold">Pending</td>
      </tr>
    `;
  } else {
    docs.forEach((d, i) => {
      html += `
        <tr>
          <td class="p-2.5 text-center font-mono">${i + 1}</td>
          <td class="p-2.5 font-bold">${d.category}</td>
          <td class="p-2.5 text-slate-500">${d.details || '-'}</td>
          <td class="p-2.5 text-center font-bold ${d.status === 'Pending' ? 'text-amber-700' : 'text-emerald-700'}">${d.status}</td>
        </tr>
      `;
    });
  }

  tbody.innerHTML = html;
}

// -------------------------------------------------------------
// 9. SEARCH & EXCEL BACKUP
// -------------------------------------------------------------
function handleGlobalAppSearch(q) {
  state.searchQuery = q;

  // Sync mobile and desktop search inputs
  const mInput = document.getElementById('appSearchInputMobile');
  const dInput = document.getElementById('appSearchInputDesktop');
  if (mInput && mInput.value !== q) mInput.value = q;
  if (dInput && dInput.value !== q) dInput.value = q;

  if (state.currentTab === 'clients') {
    renderClientsView();
  } else if (state.currentTab === 'tracker') {
    renderTrackerView();
  } else {
    switchTab('clients');
    renderClientsView();
  }
}

function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert("Export লাইব্রেরি প্রস্তুত হচ্ছে, কয়েক সেকেন্ড পর চেষ্টা করুন।");
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsClients = XLSX.utils.json_to_sheet(state.clients);
  XLSX.utils.book_append_sheet(wb, wsClients, "Master Client List");

  const wsTracker = XLSX.utils.json_to_sheet(state.tracker);
  XLSX.utils.book_append_sheet(wb, wsTracker, "Master Work Tracker");

  const wsDocs = XLSX.utils.json_to_sheet(state.documents);
  XLSX.utils.book_append_sheet(wb, wsDocs, "Master Document Log");

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `NA_Tax_Backup_${dateStr}.xlsx`);
  alert("আপনার সম্পূর্ণ ডাটাবেজ ব্যাকআপ সফলভাবে এক্সেল ফাইল আকারে ডাউনলোড হয়েছে!");
}

// -------------------------------------------------------------
// 10. NEW CLIENT MODAL
// -------------------------------------------------------------
function openNewClientModal() {
  document.getElementById('newClientModal').classList.remove('hidden');
}

function closeNewClientModal() {
  document.getElementById('newClientModal').classList.add('hidden');
}

function submitNewClient() {
  const name = document.getElementById('mClientName').value.trim();
  if (!name) {
    alert("ক্লায়েন্টের নাম আবশ্যক!");
    return;
  }

  const fileNo = document.getElementById('mClientFileNo').value.trim();
  const category = document.getElementById('mClientCategory').value;
  const contact = document.getElementById('mClientContact').value.trim();
  const tin = document.getElementById('mClientTIN').value.trim();
  const assigned = document.getElementById('mClientAssigned').value;

  const newClient = {
    id: state.clients.length + 1,
    fileNo: fileNo,
    clientName: name,
    assignedTo: assigned,
    contact: contact,
    tin: tin,
    zone: '',
    circle: '',
    clientType: 'Individual',
    folderLink: '',
    category: category
  };

  state.clients.unshift(newClient);

  if (category === 'Active' && fileNo) {
    state.tracker.unshift({
      sl: String(state.tracker.length + 1),
      fileNo: fileNo,
      clientName: name,
      assignedTo: assigned,
      entryDate: new Date().toLocaleDateString(),
      deadline: '',
      status: 'Draft',
      mainIssue: 'No Issue',
      daysActive: '1',
      tat: 'Pending',
      remarks: ''
    });
  }

  persistState();
  renderClientsView();
  renderTrackerView();
  renderDashboardView();
  renderHeaderMeta();
  populateRequisitionDropdown();
  closeNewClientModal();
  alert("নতুন ক্লায়েন্ট সফলভাবে যুক্ত হয়েছে!");
}
