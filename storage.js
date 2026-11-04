/*
 * Almacenamiento. Todo lo que se guarda pasa por aquí.
 *
 * Dos "adaptadores" con los mismos métodos (load y save):
 *  - LocalAdapter: guarda en el navegador (sin cuenta).
 *  - CloudAdapter: guarda en Supabase (con cuenta) y además deja una copia
 *    en el navegador para que funcione sin internet; cuando vuelve la
 *    conexión, sube los cambios pendientes.
 */
const LocalAdapter = {
  KEY: 'acyzlab.v1',
  async load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || null; }
    catch { return null; }
  },
  async save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); return true; }
    catch (e) { console.warn('No se pudo guardar', e); return false; }
  },
  clear() { try { localStorage.removeItem(this.KEY); } catch { /* */ } },
};

// ---------- Cuentas (Supabase Auth) ----------
const Cloud = (() => {
  const cfg = window.ACYZ_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const client = enabled
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
  let user = null;
  let status = 'idle'; // idle | saving | synced | offline | error
  const listeners = new Set();
  const setStatus = s => { status = s; listeners.forEach(fn => { try { fn(s); } catch { /* */ } }); };
  const redirectTo = () => location.origin + location.pathname;
  const MODE_KEY = 'acyzlab.mode';

  return {
    enabled,
    client,
    get user() { return user; },
    get status() { return status; },
    setStatus,
    onStatus(fn) { listeners.add(fn); },
    // "local" = la persona eligió usar la app sin cuenta en este dispositivo
    get localOnly() { try { return localStorage.getItem(MODE_KEY) === 'local'; } catch { return false; } },
    set localOnly(v) { try { v ? localStorage.setItem(MODE_KEY, 'local') : localStorage.removeItem(MODE_KEY); } catch { /* */ } },

    providers: {},
    async init() {
      if (!enabled) return null;
      // qué métodos de entrada están activos (por ejemplo, si Google ya está configurado)
      try {
        const r = await fetch(`${cfg.supabaseUrl}/auth/v1/settings`, { headers: { apikey: cfg.supabaseKey } });
        if (r.ok) this.providers = (await r.json()).external || {};
      } catch { /* sin conexión */ }
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      client.auth.onAuthStateChange((event, session) => {
        user = session ? session.user : null;
        if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('acyz:password-recovery'));
      });
      return user;
    },
    async signInWithGoogle() {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
      if (error) throw error;
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      user = data.user;
      return user;
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
      if (error) throw error;
      user = data.session ? data.user : null;
      return { user, needsConfirm: !data.session };
    },
    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    async signOut() {
      await CloudAdapter.flush();
      await client.auth.signOut();
      user = null;
      LocalAdapter.clear(); // no dejar los datos de esta cuenta en el dispositivo
    },
  };
})();

const CloudAdapter = {
  timer: null,
  pending: null,
  async load() {
    const local = await LocalAdapter.load();
    const uid = Cloud.user.id;
    const mine = local && (!local.owner || local.owner === uid) ? local : null;
    try {
      const { data, error } = await Cloud.client.from('acyzlab_user_data').select('data').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      const remote = data && data.data && data.data.schema ? data.data : null;
      Cloud.setStatus('synced');
      // Primera vez con cuenta: sube lo que ya había en este dispositivo
      if (!remote) { if (mine) { mine.owner = uid; this.save(mine); } return mine; }
      // Si la copia del dispositivo es más nueva (cambios sin internet), gana esa
      if (mine && mine.owner === uid && (mine.savedAt || '') > (remote.savedAt || '')) { this.save(mine); return mine; }
      LocalAdapter.save(remote);
      return remote;
    } catch (e) {
      console.warn('Sin conexión con la nube; usando la copia del dispositivo', e);
      Cloud.setStatus('offline');
      return mine;
    }
  },
  async save(data) {
    data.savedAt = new Date().toISOString();
    data.owner = Cloud.user ? Cloud.user.id : data.owner;
    await LocalAdapter.save(data);
    this.pending = data;
    Cloud.setStatus('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 800);
    return true;
  },
  async flush() {
    clearTimeout(this.timer);
    const data = this.pending;
    if (!data || !Cloud.user) return;
    try {
      const { error } = await Cloud.client.from('acyzlab_user_data')
        .upsert({ user_id: Cloud.user.id, data, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (this.pending === data) this.pending = null;
      Cloud.setStatus('synced');
      window.dispatchEvent(new Event('acyz:synced'));
    } catch (e) {
      console.warn('No se pudo subir a la nube; se reintentará', e);
      Cloud.setStatus(navigator.onLine ? 'error' : 'offline');
    }
  },
};
window.addEventListener('online', () => { if (CloudAdapter.pending) CloudAdapter.flush(); });

const Store = (() => {
  const SCHEMA = 1;
  const empty = () => ({ schema: SCHEMA, profile: null, plans: {}, history: [], weights: [], settings: { theme: 'auto', sound: true } });
  let data = empty();
  let adapter = LocalAdapter;

  const persist = () => adapter.save(data);

  return {
    async init(a = LocalAdapter) {
      adapter = a;
      const loaded = await adapter.load();
      data = Object.assign(empty(), loaded || {});
      data.settings = Object.assign(empty().settings, data.settings);
    },
    get profile() { return data.profile; },
    saveProfile(p) { data.profile = p; return persist(); },

    getPlan(weekKey) { return data.plans[weekKey] || null; },
    savePlan(plan) {
      data.plans[plan.weekKey] = plan;
      // guardar solo las últimas 12 semanas de planes
      const keys = Object.keys(data.plans).sort();
      while (keys.length > 12) delete data.plans[keys.shift()];
      return persist();
    },
    previousPlan(weekKey) {
      const keys = Object.keys(data.plans).filter(k => k < weekKey).sort();
      return keys.length ? data.plans[keys[keys.length - 1]] : null;
    },

    get history() { return data.history; },
    addSession(rec) { data.history.push(rec); return persist(); },

    get weights() { return data.weights; },
    addWeight(entry) {
      data.weights = data.weights.filter(w => w.date !== entry.date);
      data.weights.push(entry);
      data.weights.sort((a, b) => a.date.localeCompare(b.date));
      return persist();
    },
    removeWeight(date) { data.weights = data.weights.filter(w => w.date !== date); return persist(); },

    // código de 4 dígitos (solo se guarda su hash)
    get security() { return data.security || null; },
    saveSecurity(s) { data.security = s; return persist(); },

    get settings() { return data.settings; },
    saveSettings(s) { data.settings = Object.assign(data.settings, s); return persist(); },

    exportJSON() {
      return JSON.stringify({ app: 'acyzlab', exportedAt: new Date().toISOString(), ...data }, null, 2);
    },
    async importJSON(text) {
      const obj = JSON.parse(text);
      if (!obj || obj.app !== 'acyzlab' || typeof obj.schema !== 'number') throw new Error('El archivo no es una copia de seguridad de Acyz Lab.');
      const { app, exportedAt, ...rest } = obj;
      data = Object.assign(empty(), rest);
      return persist();
    },
    async reset() { data = empty(); return persist(); },
  };
})();
