// =============================================
// SUPABASE DATA SERVICE LAYER
// =============================================

let supabase = null;

const SUPABASE_URL = 'https://mbwowlmhwtxngqomhswi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1id293bG1od3R4bmdxb21oc3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjM3NTMsImV4cCI6MjA5NTMzOTc1M30.RLkfYre-ZrDGkuxlgPKGfSCLHqIrR3BNNe-i92lxqaU';

function initSupabase() {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized.');
        return true;
    } else {
        console.warn('⚠️ Supabase library not loaded.');
        return false;
    }
}

// ─── FETCH ALL DATA ───────────────────────────────────────
async function db_fetchAll() {
    if (!supabase) return null;
    try {
        const [incRes, expRes, logRes, admRes] = await Promise.all([
            supabase.from('incomes').select('*').order('date', { ascending: false }),
            supabase.from('expenses').select('*').order('date', { ascending: false }),
            supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(100),
            supabase.from('admins').select('*').order('created_at', { ascending: true })
        ]);

        if (incRes.error) console.error('Fetch incomes error:', incRes.error);
        if (expRes.error) console.error('Fetch expenses error:', expRes.error);
        if (logRes.error) console.error('Fetch logs error:', logRes.error);
        if (admRes.error) console.error('Fetch admins error:', admRes.error);

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
        console.error('Fetch all data exception:', error);
        return null; // Return null so it gracefully falls back to localStorage
    }
}

// ─── INCOMES ─────────────────────────────────────────────
async function db_addIncome(income) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('incomes')
        .insert({ date: income.date, amount: income.amount, description: income.description })
        .select()
        .single();
    if (error) { console.error('Insert income error:', error); return null; }
    return { id: data.id, date: data.date, amount: parseFloat(data.amount), description: data.description };
}

async function db_updateIncome(income) {
    if (!supabase) return false;
    const { error } = await supabase
        .from('incomes')
        .update({ date: income.date, amount: income.amount, description: income.description })
        .eq('id', income.id);
    if (error) { console.error('Update income error:', error); return false; }
    return true;
}

async function db_deleteIncome(id) {
    if (!supabase) return false;
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) { console.error('Delete income error:', error); return false; }
    return true;
}

// ─── EXPENSES ────────────────────────────────────────────
async function db_addExpense(expense) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('expenses')
        .insert({ date: expense.date, amount: expense.amount, description: expense.description, category: expense.category })
        .select()
        .single();
    if (error) { console.error('Insert expense error:', error); return null; }
    return { id: data.id, date: data.date, amount: parseFloat(data.amount), description: data.description, category: data.category };
}

async function db_updateExpense(expense) {
    if (!supabase) return false;
    const { error } = await supabase
        .from('expenses')
        .update({ date: expense.date, amount: expense.amount, description: expense.description, category: expense.category })
        .eq('id', expense.id);
    if (error) { console.error('Update expense error:', error); return false; }
    return true;
}

async function db_deleteExpense(id) {
    if (!supabase) return false;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('Delete expense error:', error); return false; }
    return true;
}

// ─── LOGS ─────────────────────────────────────────────────
async function db_addLog(logEntry) {
    if (!supabase) return;
    const { error } = await supabase.from('logs').insert({
        timestamp: logEntry.timestamp,
        admin: logEntry.adminName,
        action: logEntry.action,
        details: logEntry.detail
    });
    if (error) console.error('Insert log error:', error);
}

async function db_clearLogs() {
    if (!supabase) return false;
    const { error } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { console.error('Clear logs error:', error); return false; }
    return true;
}

// ─── ADMINS ──────────────────────────────────────────────
async function db_addAdmin(admin) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('admins')
        .insert({ name: admin.name, pin: admin.pin })
        .select()
        .single();
    if (error) { console.error('Insert admin error:', error); return null; }
    return { id: data.id, name: data.name, pin: data.pin };
}

async function db_deleteAdmin(id) {
    if (!supabase) return false;
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) { console.error('Delete admin error:', error); return false; }
    return true;
}

// ─── CLEAR ALL DATA ──────────────────────────────────────
async function db_clearAllData() {
    if (!supabase) return false;
    const [i, e, l] = await Promise.all([
        supabase.from('incomes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
    if (i.error || e.error || l.error) {
        console.error('Clear data errors:', i.error, e.error, l.error);
        return false;
    }
    return true;
}



