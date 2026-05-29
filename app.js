// =============================================
// SUPABASE DATA SERVICE LAYER
// =============================================

let supabaseClient = null;

const SUPABASE_URL = 'https://mbwowlmhwtxngqomhswi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id293bG1od3R4bmdxb21oc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjM3NTMsImV4cCI6MjA5NTMzOTc1M30.RLkfYre-ZrDGkuxlgPKGfSCLHqIrR3BNNe-i92lxqaU';

function initSupabase() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized.');
        return true;
    } else {
        console.warn('⚠️ Supabase library not loaded.');
        return false;
    }
}

// ─── FETCH ALL DATA ───────────────────────────────────────
async function db_fetchAll() {
    if (!supabaseClient) return null;

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase request timed out after 8s')), 8000)
    );

    try {
        const fetchPromise = Promise.all([
            supabaseClient.from('incomes').select('*').order('date', { ascending: false }),
            supabaseClient.from('expenses').select('*').order('date', { ascending: false }),
            supabaseClient.from('logs').select('*').order('created_at', { ascending: false }).limit(100),
            supabaseClient.from('admins').select('*').order('created_at', { ascending: true })
        ]);

        const [incRes, expRes, logRes, admRes] = await Promise.race([fetchPromise, timeoutPromise]);

        if (incRes.error) console.error('Fetch incomes error:', incRes.error);
        if (expRes.error) console.error('Fetch expenses error:', expRes.error);
        if (logRes.error) console.error('Fetch logs error:', logRes.error);
        if (admRes.error) console.error('Fetch admins error:', admRes.error);

        // If all responses have errors, treat as failure
        if (incRes.error && expRes.error) {
            console.warn('All Supabase queries failed, falling back to local data.');
            return null;
        }

        return {
            incomes: (incRes.data || []).map(r => ({
                id: r.id,
                date: r.date,
                amount: parseFloat(r.amount),
                description: r.description
            })),
            expenses: (expRes.data || []).map(r => ({
                id: r.id,
                date: r.date,
                amount: parseFloat(r.amount),
                description: r.description,
                category: r.category || r.description
            })),
            logs: (logRes.data || []).map(r => ({
                id: r.id,
                timestamp: r.timestamp,
                adminName: r.admin,
                action: r.action,
                detail: r.details
            })),
            admins: (admRes.data || []).map(r => ({
                id: r.id,
                name: r.name,
                pin: r.pin
            }))
        };
    } catch (error) {
        console.error('Fetch all data exception (timeout or network error):', error);
        return null; // Falls back to localStorage / mock data
    }
}


// ─── INCOMES ─────────────────────────────────────────────
async function db_addIncome(income) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
        .from('incomes')
        .insert({ date: income.date, amount: income.amount, description: income.description })
        .select()
        .single();
    if (error) { console.error('Insert income error:', error); return null; }
    return { id: data.id, date: data.date, amount: parseFloat(data.amount), description: data.description };
}

async function db_updateIncome(income) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient
        .from('incomes')
        .update({ date: income.date, amount: income.amount, description: income.description })
        .eq('id', income.id);
    if (error) { console.error('Update income error:', error); return false; }
    return true;
}

async function db_deleteIncome(id) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.from('incomes').delete().eq('id', id);
    if (error) { console.error('Delete income error:', error); return false; }
    return true;
}

// ─── EXPENSES ────────────────────────────────────────────
async function db_addExpense(expense) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
        .from('expenses')
        .insert({ date: expense.date, amount: expense.amount, description: expense.description, category: expense.category })
        .select()
        .single();
    if (error) { console.error('Insert expense error:', error); return null; }
    return { id: data.id, date: data.date, amount: parseFloat(data.amount), description: data.description, category: data.category };
}

async function db_updateExpense(expense) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient
        .from('expenses')
        .update({ date: expense.date, amount: expense.amount, description: expense.description, category: expense.category })
        .eq('id', expense.id);
    if (error) { console.error('Update expense error:', error); return false; }
    return true;
}

async function db_deleteExpense(id) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.from('expenses').delete().eq('id', id);
    if (error) { console.error('Delete expense error:', error); return false; }
    return true;
}

// ─── LOGS ─────────────────────────────────────────────────
async function db_addLog(logEntry) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('logs').insert({
        timestamp: logEntry.timestamp,
        admin: logEntry.adminName,
        action: logEntry.action,
        details: logEntry.detail
    });
    if (error) console.error('Insert log error:', error);
}

async function db_clearLogs() {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { console.error('Clear logs error:', error); return false; }
    return true;
}

// ─── ADMINS ──────────────────────────────────────────────
async function db_addAdmin(admin) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
        .from('admins')
        .insert({ name: admin.name, pin: admin.pin })
        .select()
        .single();
    if (error) { console.error('Insert admin error:', error); return null; }
    return { id: data.id, name: data.name, pin: data.pin };
}

async function db_deleteAdmin(id) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.from('admins').delete().eq('id', id);
    if (error) { console.error('Delete admin error:', error); return false; }
    return true;
}

// ─── CLEAR ALL DATA ──────────────────────────────────────
async function db_clearAllData() {
    if (!supabaseClient) return false;
    const [i, e, l] = await Promise.all([
        supabaseClient.from('incomes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabaseClient.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabaseClient.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
    if (i.error || e.error || l.error) {
        console.error('Clear data errors:', i.error, e.error, l.error);
        return false;
    }
    return true;
}


// =============================================
// DARK MODE
// =============================================
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    updateDarkModeIcon(isDark);
    updateCharts(); // Re-render charts with dark theme colors
}

function updateDarkModeIcon(isDark) {
    document.getElementById('icon-dark').classList.toggle('hidden', !isDark);
    document.getElementById('icon-light').classList.toggle('hidden', isDark);
}

// =============================================
// SIDEBAR (Mobile)
// =============================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

// =============================================
// DAY OF WEEK CONFIG
// =============================================
const DAY_NAMES = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const DAY_CONFIG = {
    'วันจันทร์': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
    'วันอังคาร': { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-800 dark:text-pink-300' },
    'วันพุธ': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
    'วันพฤหัสบดี': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-300' },
    'วันศุกร์': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300' },
    'วันเสาร์': { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300' },
    'วันอาทิตย์': { bg: 'bg-zinc-100 dark:bg-zinc-700', text: 'text-zinc-600 dark:text-zinc-300' },
};

function getDayOfWeek(dateString) {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 'วันอาทิตย์';
    const [year, month, day] = dateString.split('-').map(Number);
    return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

function getDayBadge(dateString) {
    const day = getDayOfWeek(dateString);
    const cfg = DAY_CONFIG[day] || DAY_CONFIG['วันอาทิตย์'];
    return `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.text} whitespace-nowrap">${day}</span>`;
}

// =============================================
// WEEKLY TRACKING & CALENDAR STATE
// =============================================
let dashboardViewingYear = new Date().getFullYear();

// Global state for Calendar and History
let currentViewingMonth = new Date().getMonth();
let currentViewingYear = new Date().getFullYear();

function handleTimeChange() {
    dashboardViewingYear = parseInt(document.getElementById('time-selector').value);
    updateKPIs();
    updateCharts();
}

function getWeekOfMonth(dateString) {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return -1;
    const [year, month, day] = dateString.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 7 : firstDay;
    return Math.ceil((day + adjustedFirstDay - 1) / 7);
}

function getWeekDateRange(year, monthIndex, weekNum) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let minDay = 99;
    let maxDay = -1;

    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (getWeekOfMonth(dStr) === weekNum) {
            if (d < minDay) minDay = d;
            if (d > maxDay) maxDay = d;
        }
    }

    if (maxDay === -1) return null;
    return minDay === maxDay ? `${minDay}` : `${minDay} - ${maxDay}`;
}

function handleWeeklySelectorChange() {
    currentWeekFilter = document.getElementById('weekly-selector').value;
    updateAllViews();
}

function handleChartAggregationChange() {
    // Deprecated
}

function getFilteredData() {
    const prefix = `${dashboardViewingYear}-`;
    let inc = appData.incomes.filter(i => i.date && typeof i.date === 'string' && i.date.startsWith(prefix));
    let exp = appData.expenses.filter(e => e.date && typeof e.date === 'string' && e.date.startsWith(prefix));
    return { incomes: inc, expenses: exp };
}

// =============================================
// MOCK DATA & STATE
// =============================================
const INITIAL_MOCK_DATA = {
    incomes: [
        { id: 'mock_inc_1', date: '2026-05-20', amount: 1500, description: 'ยอดขาย (เช้า)' },
        { id: 'mock_inc_2', date: '2026-05-22', amount: 2200, description: 'ยอดขาย (กลางวัน)' },
        { id: 'mock_inc_3', date: '2026-05-25', amount: 800, description: 'ยอดขาย (บ่าย)' }
    ],
    expenses: [
        { id: 'mock_exp_1', date: '2026-05-21', amount: 450, description: 'ซื้อสมุดและปากกา', category: 'เครื่องเขียน' },
        { id: 'mock_exp_2', date: '2026-05-23', amount: 1200, description: 'จ่ายค่าไอศกรีมวอลล์', category: 'ไอศกรีม' },
        { id: 'mock_exp_3', date: '2026-05-26', amount: 300, description: 'น้ำดื่ม', category: 'น้ำเปล่า' }
    ],
    logs: [
        { id: 'mock_log_1', timestamp: '20/05/2569 09:30', adminName: 'ผู้ดูแลระบบ', action: 'เพิ่ม', detail: 'เพิ่มรายรับ ยอดขาย (เช้า) (฿1500)' },
        { id: 'mock_log_2', timestamp: '21/05/2569 10:15', adminName: 'ผู้ดูแลระบบ', action: 'เพิ่ม', detail: 'เพิ่มรายจ่าย ซื้อสมุดและปากกา (฿450)' }
    ],
    admins: [{ id: 'admin_1', name: 'ผู้ดูแลระบบ', pin: '111111' }]
};

let appData = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
let currentUser = null;

async function initData() {
    // Restore dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        updateDarkModeIcon(true);
    }

    setupPinInputs();
    try { initFlatpickr(); } catch (e) { console.warn('Flatpickr init failed:', e); }

    currentViewingMonth = new Date().getMonth();
    currentViewingYear = new Date().getFullYear();
    dashboardViewingYear = new Date().getFullYear();

    // Initialize Supabase
    const sbOk = initSupabase();
    if (sbOk) {
        showLoadingOverlay(true);
        const remote = await db_fetchAll();
        showLoadingOverlay(false);
        if (remote) {
            appData = remote;
            if (!appData.admins || appData.admins.length === 0) {
                appData.admins = INITIAL_MOCK_DATA.admins;
            }

            // Show mock data if DB is completely empty so the UI looks complete
            if (appData.incomes.length === 0 && appData.expenses.length === 0) {
                appData.incomes = INITIAL_MOCK_DATA.incomes;
                appData.expenses = INITIAL_MOCK_DATA.expenses;
                appData.logs = INITIAL_MOCK_DATA.logs;
            }

            checkAuthState();
            updateAllViews();
            return;
        }
    }

    // Fallback: localStorage
    console.warn('Supabase unavailable — falling back to localStorage');
    const stored = localStorage.getItem('coopData');
    appData = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
    if (!appData.logs) appData.logs = [];
    if (!appData.admins || appData.admins.length === 0) appData.admins = INITIAL_MOCK_DATA.admins;
    checkAuthState();
    updateAllViews();
}

function showLoadingOverlay(show) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm';
        overlay.innerHTML = `<div class="flex flex-col items-center space-y-3">
            <div class="w-10 h-10 border-4 border-[#FCF6BD] border-t-transparent rounded-full animate-spin"></div>
            <span class="text-[#FCF6BD] text-sm font-semibold">กำลังโหลดข้อมูล...</span>
        </div>`;
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('hidden', !show);
}

async function reloadFromDB() {
    if (!supabaseClient) return;
    showLoadingOverlay(true);
    const remote = await db_fetchAll();
    showLoadingOverlay(false);
    if (remote) {
        appData.incomes = remote.incomes;
        appData.expenses = remote.expenses;
        appData.logs = remote.logs;
        appData.admins = remote.admins && remote.admins.length > 0 ? remote.admins : appData.admins;
    }
    updateAllViews();
}

function saveData() {
    // Legacy: only used as fallback when Supabase is unavailable
    if (!supabaseClient) localStorage.setItem('coopData', JSON.stringify(appData));
    updateAllViews();
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// =============================================
// AUTH & ACTION LOGS
// =============================================
function checkAuthState() {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const actionLogMenu = document.getElementById('menu-action-log');

    if (currentUser) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) {
            userProfile.classList.remove('hidden');
            userProfile.classList.add('flex');
            document.getElementById('profile-name').innerText = currentUser.name;
            document.getElementById('profile-initial').innerText = currentUser.name.charAt(0);
        }
        if (actionLogMenu) actionLogMenu.classList.remove('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userProfile) {
            userProfile.classList.add('hidden');
            userProfile.classList.remove('flex');
        }
        if (actionLogMenu) actionLogMenu.classList.add('hidden');
    }
}

function requireAuth(callback) {
    if (currentUser) {
        callback();
    } else {
        openLoginModal();
    }
}

function openLoginModal() {
    const modal = document.getElementById('login-modal');
    document.getElementById('login-form').reset();
    document.querySelectorAll('.pin-box').forEach(input => input.value = '');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.querySelectorAll('.pin-box')[0].focus(), 100);
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const pin = Array.from(document.querySelectorAll('.pin-box')).map(input => input.value).join('');

    const admin = appData.admins.find(a => a.pin === pin);
    if (admin) {
        currentUser = admin;
        checkAuthState();
        closeLoginModal();
        Swal.fire({
            title: 'เข้าสู่ระบบสำเร็จ',
            text: `ยินดีต้อนรับ ${admin.name}`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            customClass: { popup: 'rounded-3xl' }
        });
        updateAllViews();
    } else {
        Swal.fire({
            title: 'PIN ไม่ถูกต้อง',
            text: 'กรุณาลองใหม่อีกครั้ง',
            icon: 'error',
            confirmButtonColor: '#EC4899',
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl' }
        });
        document.getElementById('login-form').reset();
        document.querySelectorAll('.pin-box')[0].focus();
    }
}

function logout() {
    Swal.fire({
        title: 'ออกจากระบบ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'ใช่',
        cancelButtonText: 'ยกเลิก',
        customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    }).then((result) => {
        if (result.isConfirmed) {
            currentUser = null;
            checkAuthState();
            switchTab('dashboard'); // Redirect to dashboard if logged out
        }
    });
}

function setupPinInputs() {
    const pinInputs = document.querySelectorAll('.pin-box');
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', function (e) {
            if (this.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });
}

async function logAction(action, detail) {
    if (!currentUser) return;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear() + 543} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const logEntry = { timestamp: dateStr, adminName: currentUser.name, action, detail };

    if (supabaseClient) {
        await db_addLog(logEntry);
    } else {
        appData.logs.unshift({ id: generateId('log'), ...logEntry });
        if (appData.logs.length > 100) appData.logs.pop();
        saveData();
    }
}

async function exportToExcel() {
    const data = getFilteredData();
    const monthMap = new Map();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { inc: 0, exp: 0 });

    data.incomes.forEach(i => {
        const [, m] = i.date.split('-');
        monthMap.get(parseInt(m)).inc += i.amount;
    });
    data.expenses.forEach(e => {
        const [, m] = e.date.split('-');
        monthMap.get(parseInt(m)).exp += e.amount;
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('ภาพรวมรายเดือน');

    ws.addRow(['เดือน', 'รายรับ (บาท)', 'รายจ่าย (บาท)', 'คงเหลือ (บาท)']);
    ws.getRow(1).font = { name: 'Kanit', size: 12, bold: true };
    ws.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];

    let totalInc = 0, totalExp = 0, totalBal = 0;

    for (let m = 1; m <= 12; m++) {
        const inc = monthMap.get(m).inc;
        const exp = monthMap.get(m).exp;
        const bal = inc - exp;

        totalInc += inc;
        totalExp += exp;
        totalBal += bal;

        const row = ws.addRow([THAI_MONTHS[m - 1], inc || null, exp || null, bal]);
        row.font = { name: 'Kanit', size: 11 };
        row.getCell(2).numFmt = '#,##0.00';
        row.getCell(3).numFmt = '#,##0.00';
        row.getCell(4).numFmt = '#,##0.00';
    }

    const sumRow = ws.addRow(['รวมทั้งสิ้น', totalInc, totalExp, totalBal]);
    sumRow.font = { name: 'Kanit', size: 11, bold: true };
    sumRow.getCell(2).numFmt = '#,##0.00';
    sumRow.getCell(3).numFmt = '#,##0.00';
    sumRow.getCell(4).numFmt = '#,##0.00';

    const beYear = dashboardViewingYear < 2500 ? dashboardViewingYear + 543 : dashboardViewingYear;

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `รายงานสหการ_ปี_${beYear}.xlsx`);
}

async function exportHistoryToExcel() {
    const prefix = `${currentViewingYear}-${String(currentViewingMonth + 1).padStart(2, '0')}`;
    const mInc = appData.incomes.filter(i => i.date && i.date.startsWith(prefix)).map(i => ({ ...i, _type: 'inc' }));
    const mExp = appData.expenses.filter(e => e.date && e.date.startsWith(prefix)).map(e => ({ ...e, _type: 'exp' }));

    const combined = [...mInc, ...mExp].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (combined.length === 0) {
        Swal.fire({ title: 'ไม่มีข้อมูล', text: 'ไม่มีรายการในเดือนนี้ให้ส่งออก', icon: 'info', customClass: { popup: 'rounded-3xl' } });
        return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('ประวัติรายการ');

    const beYear = currentViewingYear < 2500 ? currentViewingYear + 543 : currentViewingYear;
    const monthName = THAI_MONTHS[currentViewingMonth];

    // 1. Title Row
    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `บัญชีสหการโรงเรียน ประจำเดือน${monthName} ${beYear}`;
    titleCell.font = { name: 'Kanit', size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 2. Headers
    ws.addRow(['วันที่', 'รายการ', 'รายรับ (บาท)', 'รายจ่าย (บาท)', 'คงเหลือ (บาท)']);
    const headerRow = ws.getRow(2);
    headerRow.font = { name: 'Kanit', size: 12, bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    const borderThin = { style: 'thin', color: { argb: 'FFCCCCCC' } };
    for (let i = 1; i <= 5; i++) {
        headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        headerRow.getCell(i).border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    }

    ws.columns = [
        { width: 15 }, // วันที่
        { width: 35 }, // รายการ
        { width: 15 }, // รายรับ
        { width: 15 }, // รายจ่าย
        { width: 15 }  // คงเหลือ
    ];

    const broughtForward = calculateBroughtForwardBalance(currentViewingYear, currentViewingMonth);
    let runningBalance = broughtForward;

    const bfDate = `${currentViewingYear}-${String(currentViewingMonth + 1).padStart(2, '0')}-01`;
    const bfRow = ws.addRow([
        formatDate(bfDate),
        '📊 ยอดเงินยกมาจากเดือนก่อน',
        null,
        null,
        broughtForward
    ]);
    bfRow.font = { name: 'Kanit', size: 11, bold: true, color: { argb: 'FF0000FF' } }; // Use blue color to highlight
    bfRow.getCell(5).numFmt = '#,##0.00';
    for (let i = 1; i <= 5; i++) {
        bfRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        bfRow.getCell(i).border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    }

    const weeks = [1, 2, 3, 4, 5, 6];
    let currentRowIndex = 4;

    weeks.forEach(w => {
        const weekItems = combined.filter(item => getWeekOfMonth(item.date) === w);
        if (weekItems.length === 0) return;

        let weekInc = 0;
        let weekExp = 0;
        let lastDate = null;
        let mergeStart = -1;

        weekItems.forEach(item => {
            if (item._type === 'inc') {
                runningBalance += item.amount;
                weekInc += item.amount;
            } else {
                runningBalance -= item.amount;
                weekExp += item.amount;
            }

            const row = ws.addRow([
                formatDate(item.date),
                item.description,
                item._type === 'inc' ? item.amount : null,
                item._type === 'exp' ? item.amount : null,
                null // Leave balance cell empty in item rows
            ]);

            row.font = { name: 'Kanit', size: 11 };
            row.getCell(3).numFmt = '#,##0.00';
            row.getCell(4).numFmt = '#,##0.00';
            row.getCell(5).numFmt = '#,##0.00';

            const dayName = getDayOfWeek(item.date);
            let bgColor = 'FFFFFFFF';
            switch (dayName) {
                case 'วันจันทร์': bgColor = 'FFFCF6BD'; break; // สี Astra (เหลืองพาสเทลนวลๆที่คุณเลือก)
                case 'วันอังคาร': bgColor = 'FFFFD6E0'; break; // ชมพูพาสเทลหวานๆ
                case 'วันพุธ': bgColor = 'FFC1F0C2'; break; // เขียวพาสเทลมิ้นต์
                case 'วันพฤหัสบดี': bgColor = 'FFFFD0BC'; break; // ส้มชาไทยพาสเทล
                case 'วันศุกร์': bgColor = 'FFBEE3F8'; break; // ฟ้าพาสเทลใสๆ
                case 'วันเสาร์': bgColor = 'FFE1BEE7'; break; // ม่วงพาสเทล (คงเดิมไว้)
                case 'วันอาทิตย์': bgColor = 'FFFFB7B2'; break; // แดงพาสเทลซอฟต์ๆ
            }

            for (let i = 1; i <= 5; i++) {
                row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                row.getCell(i).border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
            }

            if (item.date !== lastDate) {
                if (lastDate && mergeStart !== -1 && (currentRowIndex - 1) > mergeStart) {
                    ws.mergeCells(`A${mergeStart}:A${currentRowIndex - 1}`);
                    ws.getCell(`A${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
                }
                mergeStart = currentRowIndex;
                lastDate = item.date;
            }

            currentRowIndex++;
        });

        // End of week merge check
        if (lastDate && mergeStart !== -1 && (currentRowIndex - 1) > mergeStart) {
            ws.mergeCells(`A${mergeStart}:A${currentRowIndex - 1}`);
            ws.getCell(`A${mergeStart}`).alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // End of week summary row
        const sumRow = ws.addRow([`ผลรวมสัปดาห์ที่ ${w}`, '', weekInc || null, weekExp || null, runningBalance]);
        ws.mergeCells(`A${currentRowIndex}:B${currentRowIndex}`);

        sumRow.font = { name: 'Kanit', size: 11, bold: true, color: { argb: 'FFFF0000' } };
        sumRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        sumRow.getCell(3).numFmt = '#,##0.00';
        sumRow.getCell(4).numFmt = '#,##0.00';
        sumRow.getCell(5).numFmt = '#,##0.00';

        for (let i = 1; i <= 5; i++) {
            sumRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
            sumRow.getCell(i).border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        }

        currentRowIndex++;
    });

    // Fallback alignment for all A column cells
    ws.getColumn(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add monthly totals row
    const totalMonthInc = mInc.reduce((s, i) => s + i.amount, 0);
    const totalMonthExp = mExp.reduce((s, e) => s + e.amount, 0);
    const totalMonthBal = broughtForward + totalMonthInc - totalMonthExp;

    const totalRow = ws.addRow([
        `ผลรวมของเดือน${monthName} ${beYear}`,
        '',
        totalMonthInc || null,
        totalMonthExp || null,
        totalMonthBal
    ]);
    ws.mergeCells(`A${currentRowIndex}:B${currentRowIndex}`);
    totalRow.font = { name: 'Kanit', size: 12, bold: true, color: { argb: 'FF1a237e' } };
    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(3).numFmt = '#,##0.00';
    totalRow.getCell(4).numFmt = '#,##0.00';
    totalRow.getCell(5).numFmt = '#,##0.00';
    for (let i = 1; i <= 5; i++) {
        totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1C4E9' } };
        totalRow.getCell(i).border = { top: { style: 'medium', color: { argb: 'FF5C35CC' } }, left: borderThin, bottom: { style: 'medium', color: { argb: 'FF5C35CC' } }, right: borderThin };
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `ประวัติรายการ_${monthName}_${beYear}.xlsx`);
}

// =============================================
// FORMATTING
// =============================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return dateString || '-';
    const [year, month, day] = dateString.split('-');
    let y = parseInt(year);
    if (y < 2500) y += 543;
    return `${day}/${month}/${y}`;
}

// =============================================
// NAVIGATION
// =============================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    document.getElementById(`view-${tabId}`)?.classList.replace('hidden', 'block');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-pink-400', 'text-white');
        btn.classList.add('text-gray-400');
    });
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400');
        activeBtn.classList.add('text-pink-400');
    }

    // Auto-close sidebar on mobile
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    setTimeout(() => {
        if (overviewChart) overviewChart.resize();
        if (incomeChart) incomeChart.resize();
        if (expenseChart) expenseChart.resize();
    }, 50);
}

// =============================================
// MODAL & FLATPICKR
// =============================================
const KNOWN_INCOME_TYPES = ['ยอดขาย (เช้า)', 'ยอดขาย (กลางวัน)', 'ยอดขาย (บ่าย)', 'ยืมเงินงบพัฒฯ'];
const KNOWN_EXPENSE_CATS = ['ไอศกรีม', 'เครื่องเขียน', 'น้ำเสริมสุข', 'น้ำเปล่า', 'แม็คโคร', 'คืนเงินงบพัฒฯ'];

let datePickerInstance = null;

function initFlatpickr() {
    if (datePickerInstance) datePickerInstance.destroy();

    datePickerInstance = flatpickr("#form-date", {
        locale: "th",
        dateFormat: "Y-m-d", // Value saved in form
        altInput: true,
        altFormat: "d/m/Y", // Dummy format, overriden below
        formatDate: (date, formatStr, locale) => {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            let y = date.getFullYear();
            if (y < 2500) y += 543;
            return `${d}/${m}/${y}`;
        },
        allowInput: true
    });
}

function openModal(type, id = null) {
    requireAuth(() => {
        const modal = document.getElementById('data-modal');
        document.getElementById('data-form').reset();
        document.getElementById('form-type').value = type;
        document.getElementById('form-id').value = id || '';

        // Reset all conditional fields
        ['income-desc-container', 'income-desc-custom',
            'expense-category-container', 'expense-cat-custom'].forEach(elId => {
                const el = document.getElementById(elId);
                if (el) el.classList.add('hidden');
            });
        document.getElementById('form-income-desc-text').removeAttribute('required');
        document.getElementById('form-category-custom').removeAttribute('required');

        document.getElementById('modal-title').innerText = id
            ? (type === 'income' ? 'แก้ไขรายรับ' : 'แก้ไขรายจ่าย')
            : (type === 'income' ? 'เพิ่มรายรับ' : 'เพิ่มรายจ่าย');

        if (type === 'income') {
            document.getElementById('income-desc-container').classList.remove('hidden');
        } else {
            document.getElementById('expense-category-container').classList.remove('hidden');
        }

        if (id) {
            const item = type === 'income'
                ? appData.incomes.find(i => i.id === id)
                : appData.expenses.find(e => e.id === id);

            if (item) {
                // Fix any corrupted dates like DD/MM/YYYY into YYYY-MM-DD for input
                let safeDate = item.date;
                if (safeDate && safeDate.includes('/')) {
                    const parts = safeDate.split('/');
                    if (parts.length === 3) safeDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                if (datePickerInstance) {
                    datePickerInstance.setDate(safeDate);
                } else {
                    document.getElementById('form-date').value = safeDate;
                }
                document.getElementById('form-amount').value = item.amount;

                if (type === 'income') {
                    const typeSelect = document.getElementById('form-income-type');
                    if (KNOWN_INCOME_TYPES.includes(item.description)) {
                        typeSelect.value = item.description;
                    } else {
                        typeSelect.value = 'other';
                        document.getElementById('income-desc-custom').classList.remove('hidden');
                        document.getElementById('form-income-desc-text').value = item.description;
                        document.getElementById('form-income-desc-text').setAttribute('required', 'true');
                    }
                } else {
                    const catSelect = document.getElementById('form-category');
                    const val = item.category || item.description;
                    if (KNOWN_EXPENSE_CATS.includes(val)) {
                        catSelect.value = val;
                    } else {
                        catSelect.value = 'อื่นๆ';
                        document.getElementById('expense-cat-custom').classList.remove('hidden');
                        document.getElementById('form-category-custom').value = val;
                        document.getElementById('form-category-custom').setAttribute('required', 'true');
                    }
                }
            }
        } else {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const defaultDate = `${yyyy}-${mm}-${dd}`;
            if (datePickerInstance) {
                datePickerInstance.setDate(defaultDate);
            } else {
                document.getElementById('form-date').value = defaultDate;
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

function closeModal() {
    document.getElementById('data-modal').classList.add('hidden');
    document.getElementById('data-modal').classList.remove('flex');
}

function handleIncomeTypeChange() {
    const val = document.getElementById('form-income-type').value;
    const customDiv = document.getElementById('income-desc-custom');
    const customInput = document.getElementById('form-income-desc-text');
    if (val === 'other') {
        customDiv.classList.remove('hidden');
        customInput.setAttribute('required', 'true');
    } else {
        customDiv.classList.add('hidden');
        customInput.removeAttribute('required');
    }
}

function handleExpenseCategoryChange() {
    const val = document.getElementById('form-category').value;
    const customDiv = document.getElementById('expense-cat-custom');
    const customInput = document.getElementById('form-category-custom');
    if (val === 'อื่นๆ') {
        customDiv.classList.remove('hidden');
        customInput.setAttribute('required', 'true');
    } else {
        customDiv.classList.add('hidden');
        customInput.removeAttribute('required');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    Swal.fire({
        title: 'ยืนยันการบันทึก?',
        text: "คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981', // Pastel green
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'ใช่, บันทึกเลย',
        cancelButtonText: 'ยกเลิก',
        width: '320px',
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl',
            cancelButton: 'rounded-xl'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const type = document.getElementById('form-type').value;
                const id = document.getElementById('form-id').value;
                let date = '';

                if (datePickerInstance && datePickerInstance.selectedDates.length > 0) {
                    let d = datePickerInstance.selectedDates[0];
                    let y = d.getFullYear();
                    if (y > 2500) y -= 543; // Safeguard if flatpickr provides B.E. year
                    let m = String(d.getMonth() + 1).padStart(2, '0');
                    let day = String(d.getDate()).padStart(2, '0');
                    date = `${y}-${m}-${day}`;
                } else {
                    date = document.getElementById('form-date').value;
                    if (date && date.includes('/')) {
                        const parts = date.split('/');
                        if (parts.length === 3) {
                            let y = parseInt(parts[2]);
                            if (y > 2500) y -= 543;
                            date = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    } else if (date && date.includes('-')) {
                        const parts = date.split('-');
                        if (parts.length === 3) {
                            let y = parseInt(parts[0]);
                            if (y > 2500) {
                                y -= 543;
                                date = `${y}-${parts[1]}-${parts[2]}`;
                            }
                        }
                    }
                }
                const amount = parseFloat(document.getElementById('form-amount').value);

                const newData = { date, amount };

                if (type === 'income') {
                    const sel = document.getElementById('form-income-type').value;
                    newData.description = sel === 'other'
                        ? document.getElementById('form-income-desc-text').value.trim()
                        : sel;
                } else {
                    const cat = document.getElementById('form-category').value;
                    newData.description = cat === 'อื่นๆ'
                        ? (document.getElementById('form-category-custom').value.trim() || 'อื่นๆ')
                        : cat;
                    newData.category = newData.description;
                }

                let actionDesc = '';
                let success = false;

                if (supabaseClient) {
                    if (id) {
                        const existing = type === 'income'
                            ? appData.incomes.find(i => i.id === id)
                            : appData.expenses.find(e => e.id === id);
                        const oldAmt = existing ? existing.amount : '?';
                        const updated = { id, ...newData };
                        success = type === 'income' ? await db_updateIncome(updated) : await db_updateExpense(updated);
                        actionDesc = `แก้ไข${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${newData.description} (฿${oldAmt} -> ฿${newData.amount})`;
                    } else {
                        const inserted = type === 'income' ? await db_addIncome(newData) : await db_addExpense(newData);
                        success = !!inserted;
                        actionDesc = `เพิ่ม${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${newData.description} (฿${newData.amount})`;
                    }

                    if (!success) {
                        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่', icon: 'error', customClass: { popup: 'rounded-3xl' } });
                        return;
                    }
                    await logAction(id ? 'แก้ไข' : 'เพิ่ม', actionDesc);
                    closeModal();
                    await reloadFromDB();
                } else {
                    // Fallback localStorage
                    if (id) {
                        const arr = type === 'income' ? appData.incomes : appData.expenses;
                        const idx = arr.findIndex(i => i.id === id);
                        if (idx > -1) {
                            const oldAmt = arr[idx].amount;
                            arr[idx] = { ...arr[idx], ...newData };
                            actionDesc = `แก้ไข${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${newData.description} (฿${oldAmt} -> ฿${newData.amount})`;
                        }
                    } else {
                        newData.id = generateId(type.substring(0, 3));
                        if (type === 'income') appData.incomes.push(newData);
                        else appData.expenses.push(newData);
                        actionDesc = `เพิ่ม${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${newData.description} (฿${newData.amount})`;
                    }
                    await logAction(id ? 'แก้ไข' : 'เพิ่ม', actionDesc);
                    const byDate = (a, b) => new Date(b.date) - new Date(a.date);
                    appData.incomes.sort(byDate);
                    appData.expenses.sort(byDate);
                    saveData();
                    closeModal();
                }

                Swal.fire({
                    title: 'สำเร็จ!',
                    text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    width: '320px',
                    customClass: { popup: 'rounded-3xl' }
                });
            } catch (err) {
                alert('JS Error (Save): ' + err.stack);
            }
        }
    });
}

function deleteData(type, id) {
    requireAuth(() => {
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F87171',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'ใช่, ลบเลย',
            cancelButtonText: 'ยกเลิก',
            width: '320px',
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const deletedItem = type === 'income'
                        ? appData.incomes.find(i => i.id === id)
                        : appData.expenses.find(e => e.id === id);

                    if (supabaseClient) {
                        const ok = type === 'income' ? await db_deleteIncome(id) : await db_deleteExpense(id);
                        if (!ok) {
                            Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบข้อมูลได้', icon: 'error', customClass: { popup: 'rounded-3xl' } });
                            return;
                        }
                        if (deletedItem) await logAction('ลบ', `ลบ${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${deletedItem.description} (฿${deletedItem.amount})`);
                        await reloadFromDB();
                    } else {
                        if (type === 'income') appData.incomes = appData.incomes.filter(i => i.id !== id);
                        else appData.expenses = appData.expenses.filter(e => e.id !== id);
                        if (deletedItem) await logAction('ลบ', `ลบ${type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${deletedItem.description} (฿${deletedItem.amount})`);
                        saveData();
                    }

                    Swal.fire({
                        title: 'ลบแล้ว!',
                        text: 'รายการถูกลบเรียบร้อยแล้ว',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false,
                        width: '320px',
                        customClass: { popup: 'rounded-3xl' }
                    });
                } catch (err) {
                    alert('JS Error (Delete): ' + err.stack);
                }
            }
        });
    });
}

// =============================================
// VIEW UPDATES
// =============================================
let overviewChart, incomeChart, expenseChart;

function updateDashboardTimeSelector() {
    const sel = document.getElementById('time-selector');
    if (!sel) return;

    let html = '';
    const years = new Set([new Date().getFullYear(), dashboardViewingYear]);
    appData.incomes.forEach(i => i.date && years.add(parseInt(i.date.split('-')[0])));
    appData.expenses.forEach(e => e.date && years.add(parseInt(e.date.split('-')[0])));

    const sortedYears = Array.from(years).filter(y => !isNaN(y) && y > 1900 && y < 3000).sort((a, b) => b - a);
    sortedYears.forEach(y => {
        const selected = (y === dashboardViewingYear) ? 'selected' : '';
        const beYear = y < 2500 ? y + 543 : y;
        html += `<option value="${y}" ${selected}>ปี พ.ศ. ${beYear}</option>`;
    });
    sel.innerHTML = html;
}

function updateAllViews() {
    updateDashboardTimeSelector();
    updateKPIs();
    renderCalendar();
    renderWeeklyAccordion();
    updateCharts();
    renderActionLog();
    renderAdmins();
}

function updateKPIs() {
    const data = getFilteredData();
    const totalIncome = data.incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = data.expenses.reduce((s, e) => s + e.amount, 0);
    const netBalance = totalIncome - totalExpense;

    document.getElementById('kpi-total-income').innerText = formatCurrency(totalIncome);
    document.getElementById('kpi-total-expense').innerText = formatCurrency(totalExpense);
    document.getElementById('kpi-net-balance').innerText = formatCurrency(netBalance);

    const el = document.getElementById('kpi-net-balance');
    el.classList.toggle('text-red-600', netBalance < 0);
    el.classList.toggle('text-gray-900', netBalance >= 0);
}

function actionBtns(type, id) {
    return `
        <div class="flex justify-center space-x-1">
            <button onclick="openModal('${type}','${id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="แก้ไข">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button onclick="deleteData('${type}','${id}')" class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="ลบ">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>`;
}

// =============================================
// CALENDAR VIEW
// =============================================
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function changeMonth(dir) {
    currentViewingMonth += dir;
    if (currentViewingMonth < 0) { currentViewingMonth = 11; currentViewingYear--; }
    else if (currentViewingMonth > 11) { currentViewingMonth = 0; currentViewingYear++; }
    renderCalendar();
    renderWeeklyAccordion();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');

    if (!grid || !monthYearLabel) return;

    monthYearLabel.innerText = `${THAI_MONTHS[currentViewingMonth]} ${currentViewingYear + 543}`;

    const firstDay = new Date(currentViewingYear, currentViewingMonth, 1).getDay();
    const daysInMonth = new Date(currentViewingYear, currentViewingMonth + 1, 0).getDate();

    // Group data by date
    const dailyData = {};
    const prefix = `${currentViewingYear}-${String(currentViewingMonth + 1).padStart(2, '0')}`;

    const filterAndSum = (arr, dateStr) => {
        const items = arr.filter(x => x.date === dateStr);
        return { items, total: items.reduce((s, x) => s + x.amount, 0) };
    };

    let html = '';

    // Empty boxes for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="bg-transparent rounded-xl h-20 sm:h-24"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${prefix}-${String(d).padStart(2, '0')}`;
        const inc = filterAndSum(appData.incomes, dateStr);
        const exp = filterAndSum(appData.expenses, dateStr);

        const hasData = inc.total > 0 || exp.total > 0;

        html += `
            <div onclick="openDayModal('${dateStr}')" class="bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-700 border border-zinc-100 dark:border-zinc-700/50 rounded-xl p-1 sm:p-2 flex flex-col h-20 sm:h-24 transition-all cursor-pointer ${hasData ? 'shadow-sm' : ''}">
                <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">${d}</span>
                <div class="flex flex-col space-y-0.5 mt-auto">
                    ${inc.total > 0 ? `<div class="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded rounded-md text-right">+${formatCurrency(inc.total)}</div>` : ''}
                    ${exp.total > 0 ? `<div class="text-[10px] sm:text-xs font-medium text-pink-600 dark:text-pink-400 truncate bg-pink-50 dark:bg-pink-900/20 px-1 rounded rounded-md text-right">-${formatCurrency(exp.total)}</div>` : ''}
                </div>
            </div>`;
    }

    grid.innerHTML = html;
}

// =============================================
// DAY DETAILS MODAL
// =============================================
function openDayModal(dateStr) {
    const incItems = appData.incomes.filter(i => i.date === dateStr);
    const expItems = appData.expenses.filter(e => e.date === dateStr);

    if (incItems.length === 0 && expItems.length === 0) return; // Ignore empty days

    document.getElementById('day-modal-date').innerText = formatDate(dateStr);

    const incContainer = document.getElementById('day-modal-income');
    incContainer.innerHTML = incItems.length === 0 ? '<p class="text-xs text-zinc-400">ไม่มีรายการ</p>' :
        incItems.map(i => `
            <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">${i.description}</span>
                <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">+${formatCurrency(i.amount)}</span>
            </div>
        `).join('');

    const expContainer = document.getElementById('day-modal-expense');
    expContainer.innerHTML = expItems.length === 0 ? '<p class="text-xs text-zinc-400">ไม่มีรายการ</p>' :
        expItems.map(e => `
            <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">${e.description}</span>
                    ${e.category && e.category !== e.description ? `<span class="text-[10px] text-zinc-500">${e.category}</span>` : ''}
                </div>
                <span class="text-sm font-bold text-pink-600 dark:text-pink-400">-${formatCurrency(e.amount)}</span>
            </div>
        `).join('');

    const modal = document.getElementById('day-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDayModal() {
    const modal = document.getElementById('day-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// =============================================
// WEEKLY ACCORDION (HISTORY VIEW)
// =============================================
function calculateBroughtForwardBalance(targetYear, targetMonth) {
    const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
    let totalInc = 0;
    appData.incomes.forEach(i => {
        if (i.date && i.date < targetDateStr) totalInc += i.amount;
    });
    let totalExp = 0;
    appData.expenses.forEach(e => {
        if (e.date && e.date < targetDateStr) totalExp += e.amount;
    });
    return totalInc - totalExp;
}

function renderWeeklyAccordion() {
    const container = document.getElementById('accordion-container');
    const historyMonthLabel = document.getElementById('history-month-year');
    if (!container) return;

    if (historyMonthLabel) {
        historyMonthLabel.innerText = `${THAI_MONTHS[currentViewingMonth]} ${currentViewingYear + 543}`;
    }

    const prefix = `${currentViewingYear}-${String(currentViewingMonth + 1).padStart(2, '0')}`;
    const allInc = appData.incomes.filter(i => i.date && typeof i.date === 'string' && i.date.startsWith(prefix));
    const allExp = appData.expenses.filter(e => e.date && typeof e.date === 'string' && e.date.startsWith(prefix));

    // Calculate Brought Forward
    const broughtForward = calculateBroughtForwardBalance(currentViewingYear, currentViewingMonth);

    // Update History KPIs
    const sumAllInc = allInc.reduce((s, i) => s + i.amount, 0);
    const sumAllExp = allExp.reduce((s, e) => s + e.amount, 0);
    // Calculate Absolute Total Balance
    const absoluteTotalInc = appData.incomes.reduce((s, i) => s + i.amount, 0);
    const absoluteTotalExp = appData.expenses.reduce((s, e) => s + e.amount, 0);
    const absoluteTotalBalance = absoluteTotalInc - absoluteTotalExp;

    const elHistoryTotalBalance = document.getElementById('history-kpi-total-balance');
    const elHistoryIncome = document.getElementById('history-kpi-income');
    const elHistoryExpense = document.getElementById('history-kpi-expense');

    if (elHistoryTotalBalance) {
        elHistoryTotalBalance.innerText = formatCurrency(absoluteTotalBalance);
        elHistoryTotalBalance.className = `text-3xl sm:text-4xl md:text-5xl font-black relative z-10 ${absoluteTotalBalance >= 0 ? 'text-[#FCF6BD]' : 'text-red-400'}`;
    }
    if (elHistoryIncome) elHistoryIncome.innerText = formatCurrency(sumAllInc);
    if (elHistoryExpense) elHistoryExpense.innerText = formatCurrency(sumAllExp);

    if (allInc.length === 0 && allExp.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-zinc-400 text-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">ยังไม่มีรายการในเดือนนี้</div>`;
        return;
    }

    // Render Brought Forward Row
    const bfDate = `${currentViewingYear}-${String(currentViewingMonth + 1).padStart(2, '0')}-01`;
    let html = `
    <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-3 border border-zinc-100 dark:border-zinc-700/50">
        <div class="p-4 sm:p-5">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-700/50">
                            <th class="px-2 py-2 whitespace-nowrap">วัน</th>
                            <th class="px-2 py-2 whitespace-nowrap">วันที่</th>
                            <th class="px-2 py-2">รายการ</th>
                            <th class="px-2 py-2 text-right">รายรับ (฿)</th>
                            <th class="px-2 py-2 text-right">รายจ่าย (฿)</th>
                            <th class="px-2 py-2 text-right">คงเหลือ (฿)</th>
                            <th class="px-2 py-2 text-center w-12 sm:w-20">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-50 dark:divide-zinc-700/50 text-sm">
                        <tr class="transition-colors bg-amber-50/50 dark:bg-[#FCF6BD]/10 border-l-2 border-amber-500 dark:border-[#FCF6BD]">
                            <td class="px-2 py-2.5 whitespace-nowrap">${getDayBadge(bfDate)}</td>
                            <td class="px-2 py-2.5 text-xs text-zinc-500 dark:text-[#FCF6BD]/70 whitespace-nowrap">${formatDate(bfDate)}</td>
                            <td class="px-2 py-2.5 font-bold text-amber-700 dark:text-[#FCF6BD]">ยอดเงินยกมาจากเดือนก่อน</td>
                            <td class="px-2 py-2.5 text-right text-zinc-400">-</td>
                            <td class="px-2 py-2.5 text-right text-zinc-400">-</td>
                            <td class="px-2 py-2.5 text-right font-bold text-amber-700 dark:text-[#FCF6BD]">${formatCurrency(broughtForward)}</td>
                            <td class="px-2 py-2.5 text-center text-zinc-400 text-xs">ล็อก</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    if (allInc.length === 0 && allExp.length === 0) {
        container.innerHTML = html + `<div class="text-center py-10 text-zinc-400 text-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">ไม่มีรายการใหม่ในเดือนนี้</div>`;
        return;
    }

    // We group by week number 1-6
    const weeks = [1, 2, 3, 4, 5, 6];
    let runningBalance = broughtForward;

    weeks.forEach(w => {
        const wInc = allInc.filter(i => getWeekOfMonth(i.date) === w);
        const wExp = allExp.filter(e => getWeekOfMonth(e.date) === w);

        if (wInc.length === 0 && wExp.length === 0) return;

        const sumInc = wInc.reduce((s, i) => s + i.amount, 0);
        const sumExp = wExp.reduce((s, e) => s + e.amount, 0);
        const net = sumInc - sumExp;

        // Sort items oldest first within the week
        const combined = [
            ...wInc.map(i => ({ ...i, _type: 'inc' })),
            ...wExp.map(e => ({ ...e, _type: 'exp' }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        const rangeString = getWeekDateRange(currentViewingYear, currentViewingMonth, w);
        const dateRangeText = rangeString ? `(วันที่ ${rangeString})` : '';

        html += `
        <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all border border-zinc-100 dark:border-zinc-700/50">
            <!-- Header (Click to toggle) -->
            <button onclick="toggleAccordion('week-${w}')" class="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors focus:outline-none">
                <div class="flex items-center space-x-3">
                    <div class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <div class="text-left">
                        <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-100">สัปดาห์ที่ ${w}</h3>
                        <p class="text-[11px] text-zinc-500">${dateRangeText} ${THAI_MONTHS[currentViewingMonth]}</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4 sm:space-x-8">
                    <div class="hidden sm:flex flex-col text-right">
                        <span class="text-[10px] text-zinc-500 uppercase">รายรับ</span>
                        <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+${formatCurrency(sumInc)}</span>
                    </div>
                    <div class="hidden sm:flex flex-col text-right">
                        <span class="text-[10px] text-zinc-500 uppercase">รายจ่าย</span>
                        <span class="text-sm font-semibold text-pink-600 dark:text-pink-400">-${formatCurrency(sumExp)}</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="text-[10px] text-zinc-500 uppercase">คงเหลือรายสัปดาห์</span>
                        <span class="text-sm font-bold ${runningBalance + net >= 0 ? 'text-zinc-800 dark:text-zinc-100' : 'text-red-600'}">${formatCurrency(runningBalance + net)}</span>
                    </div>
                    <svg class="w-5 h-5 text-zinc-400 transform transition-transform duration-200" id="icon-week-${w}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
            </button>
            
            <!-- Content (Hidden by default) -->
            <div id="week-${w}" class="hidden border-t border-zinc-100 dark:border-zinc-700/50">
                <div class="p-4 sm:p-5">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr class="text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-700/50">
                                    <th class="px-2 py-2 whitespace-nowrap">วัน</th>
                                    <th class="px-2 py-2 whitespace-nowrap">วันที่</th>
                                    <th class="px-2 py-2">รายการ</th>
                                    <th class="px-2 py-2 text-right">รายรับ (฿)</th>
                                    <th class="px-2 py-2 text-right">รายจ่าย (฿)</th>
                                    <th class="px-2 py-2 text-right">คงเหลือ (฿)</th>
                                    <th class="px-2 py-2 text-center w-12 sm:w-20">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-50 dark:divide-zinc-700/50 text-sm">
                                ${combined.map(item => {
            if (item._type === 'inc') runningBalance += item.amount;
            else runningBalance -= item.amount;
            return `
                                    <tr class="transition-colors">
                                        <td class="px-2 py-2.5 whitespace-nowrap">${getDayBadge(item.date)}</td>
                                        <td class="px-2 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">${formatDate(item.date)}</td>
                                        <td class="px-2 py-2.5">
                                            <div class="flex flex-col">
                                                <span class="font-medium text-zinc-800 dark:text-zinc-200">${item.description}</span>
                                                ${item._type === 'exp' && item.category && item.category !== item.description ? `<span class="text-[10px] text-zinc-500">${item.category}</span>` : ''}
                                            </div>
                                        </td>
                                        <td class="px-2 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                            ${item._type === 'inc' ? '+' + formatCurrency(item.amount) : '-'}
                                        </td>
                                        <td class="px-2 py-2.5 text-right font-semibold text-pink-600 dark:text-pink-400 whitespace-nowrap">
                                            ${item._type === 'exp' ? '-' + formatCurrency(item.amount) : '-'}
                                        </td>
                                        <td class="px-2 py-2.5 text-right font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                            ${formatCurrency(runningBalance)}
                                        </td>
                                        <td class="px-2 py-2.5 text-center">${actionBtns(item._type === 'inc' ? 'income' : 'expense', item.id)}</td>
                                    </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        el.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

// =============================================
// CHARTS
// =============================================
function updateCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const tickColor = isDark ? '#71717a' : '#a1a1aa';
    const legendColor = isDark ? '#d4d4d8' : '#3f3f46';

    // 1. Overview Bar Chart
    const data = getFilteredData();

    // Always show monthly breakdown for the selected year on dashboard
    const monthMap = new Map();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { inc: 0, exp: 0 });

    data.incomes.forEach(i => {
        const [, m] = i.date.split('-');
        monthMap.get(parseInt(m)).inc += i.amount;
    });
    data.expenses.forEach(e => {
        const [, m] = e.date.split('-');
        monthMap.get(parseInt(m)).exp += e.amount;
    });

    const overviewLabels = THAI_MONTHS;
    const incomeData = Array.from(monthMap.values()).map(v => v.inc);
    const expenseData = Array.from(monthMap.values()).map(v => v.exp);

    const overviewCtx = document.getElementById('overviewChart').getContext('2d');
    if (overviewChart) overviewChart.destroy();
    overviewChart = new Chart(overviewCtx, {
        type: 'bar',
        data: {
            labels: overviewLabels,
            datasets: [
                {
                    label: 'รายรับ',
                    data: incomeData,
                    backgroundColor: '#10B981', borderRadius: 8, borderSkipped: false,
                    barPercentage: 0.45, categoryPercentage: 0.7
                },
                {
                    label: 'รายจ่าย',
                    data: expenseData,
                    backgroundColor: '#F97316', borderRadius: 8, borderSkipped: false,
                    barPercentage: 0.45, categoryPercentage: 0.7
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 }, color: legendColor }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { font: { size: 10 }, color: tickColor } },
                x: { grid: { display: false }, ticks: { font: { size: 9 }, color: tickColor, maxRotation: 45 } }
            }
        }
    });

    // 2. Income Doughnut
    const elInc = document.getElementById('incomeChart');
    if (elInc) {
        const incomeDescMap = {};
        data.incomes.forEach(i => { incomeDescMap[i.description] = (incomeDescMap[i.description] || 0) + i.amount; });
        const incColors = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857', '#A7F3D0'];
        const incCtx = elInc.getContext('2d');
        if (incomeChart) incomeChart.destroy();
        incomeChart = new Chart(incCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(incomeDescMap),
                datasets: [{
                    data: Object.values(incomeDescMap),
                    backgroundColor: incColors,
                    borderWidth: 2,
                    borderColor: isDark ? '#064e3b' : '#bbf7d0'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 8, font: { size: 9 }, boxWidth: 8, color: legendColor }
                    }
                },
                cutout: '78%'
            }
        });
    }

    // 3. Expense Doughnut
    const elExp = document.getElementById('expenseChart');
    if (elExp) {
        const expCatMap = {};
        data.expenses.forEach(e => { expCatMap[e.category] = (expCatMap[e.category] || 0) + e.amount; });
        const expColors = ['#F97316', '#FB923C', '#EA580C', '#FDBA74', '#C2410C', '#FFEDD5'];
        const expCtx = elExp.getContext('2d');
        if (expenseChart) expenseChart.destroy();
        expenseChart = new Chart(expCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expCatMap),
                datasets: [{
                    data: Object.values(expCatMap),
                    backgroundColor: expColors,
                    borderWidth: 2,
                    borderColor: isDark ? '#831843' : '#fbcfe8'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 8, font: { size: 9 }, boxWidth: 8, color: legendColor }
                    }
                },
                cutout: '78%'
            }
        });
    }
}

// =============================================
// ACTION LOGS & SETTINGS VIEWS
// =============================================
function renderActionLog() {
    const tbody = document.getElementById('action-log-body');
    if (!tbody) return;

    if (appData.logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-8 text-center text-zinc-400">ยังไม่มีประวัติการบันทึก</td></tr>`;
        return;
    }

    tbody.innerHTML = appData.logs.map(log => {
        let actionColor = 'text-zinc-500';
        if (log.action === 'เพิ่ม') actionColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded';
        else if (log.action === 'แก้ไข') actionColor = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded';
        else if (log.action === 'ลบ') actionColor = 'text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded';

        return `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
            <td class="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">${log.timestamp}</td>
            <td class="px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">${log.adminName}</td>
            <td class="px-3 py-2.5 text-xs font-medium"><span class="${actionColor}">${log.action}</span></td>
            <td class="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">${log.detail}</td>
        </tr>
    `}).join('');
}

function renderAdmins() {
    const tbody = document.getElementById('admin-list-body');
    if (!tbody) return;

    tbody.innerHTML = appData.admins.map(admin => `
        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
            <td class="px-2 py-2.5 flex items-center space-x-2">
                <div class="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">${admin.name.charAt(0)}</div>
                <span class="font-medium text-zinc-800 dark:text-zinc-200">${admin.name}</span>
            </td>
            <td class="px-2 py-2.5 text-center">
                ${appData.admins.length > 1 ? `
                <button onclick="deleteAdmin('${admin.id}')" class="text-xs text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 rounded">
                    ลบ
                </button>
                ` : '<span class="text-xs text-zinc-400">แอดมินหลัก</span>'}
            </td>
        </tr>
    `).join('');
}

function openAdminModal() {
    requireAuth(() => {
        const modal = document.getElementById('admin-modal');
        document.getElementById('admin-form').reset();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleAdminSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('admin-name').value.trim();
    const pin = document.getElementById('admin-pin').value.trim();

    if (appData.admins.some(a => a.pin === pin)) {
        Swal.fire({ title: 'PIN ซ้ำซ้อน', text: 'รหัส PIN นี้ถูกใช้งานแล้ว กรุณาตั้งใหม่', icon: 'warning', customClass: { popup: 'rounded-3xl' } });
        return;
    }

    if (supabaseClient) {
        const inserted = await db_addAdmin({ name, pin });
        if (!inserted) {
            Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเพิ่มแอดมินได้', icon: 'error', customClass: { popup: 'rounded-3xl' } });
            return;
        }
        appData.admins.push(inserted);
    } else {
        appData.admins.push({ id: generateId('adm'), name, pin });
        saveData();
    }

    closeAdminModal();
    renderAdmins();
    Swal.fire({ title: 'เพิ่มแอดมินสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
}

function deleteAdmin(id) {
    requireAuth(() => {
        Swal.fire({
            title: 'ลบแอดมิน?',
            text: "ลบสิทธิ์การเข้าถึงของแอดมินนี้",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F87171',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'ลบ',
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (supabaseClient) {
                    const ok = await db_deleteAdmin(id);
                    if (!ok) return;
                }
                appData.admins = appData.admins.filter(a => a.id !== id);
                if (currentUser && currentUser.id === id) {
                    currentUser = null;
                    checkAuthState();
                    switchTab('dashboard');
                }
                if (!supabaseClient) saveData();
                renderAdmins();
            }
        });
    });
}

function clearAllData() {
    requireAuth(() => {
        Swal.fire({
            title: 'ยืนยันเคลียร์ข้อมูลทั้งหมด?',
            text: "ข้อมูลรายรับ รายจ่าย และประวัติจะถูกลบทั้งหมด ไม่สามารถกู้คืนได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'ยืนยันเคลียร์ข้อมูล',
            cancelButtonText: 'ยกเลิก',
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (supabaseClient) {
                    const ok = await db_clearAllData();
                    if (!ok) {
                        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเคลียร์ข้อมูลได้', icon: 'error', customClass: { popup: 'rounded-3xl' } });
                        return;
                    }
                    appData.incomes = [];
                    appData.expenses = [];
                    appData.logs = [];
                    updateAllViews();
                } else {
                    appData.incomes = [];
                    appData.expenses = [];
                    appData.logs = [];
                    saveData();
                }
                Swal.fire({ title: 'เคลียร์ข้อมูลสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
            }
        });
    });
}

function clearLogs() {
    requireAuth(() => {
        Swal.fire({
            title: 'ล้างประวัติการบันทึก?',
            text: 'ประวัติการบันทึกทั้งหมดจะถูกลบ ไม่สามารถกู้คืนได้',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#F87171',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'ล้างเลย',
            cancelButtonText: 'ยกเลิก',
            customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (supabaseClient) {
                    const ok = await db_clearLogs();
                    if (!ok) {
                        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถล้างประวัติได้', icon: 'error', customClass: { popup: 'rounded-3xl' } });
                        return;
                    }
                }
                appData.logs = [];
                renderActionLog();
                Swal.fire({ title: 'ล้างประวัติสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
            }
        });
    });
}



// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    switchTab('dashboard');
    await initData();
});

