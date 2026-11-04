/*
 * Amigos y ranking de poder (Supabase).
 * - acyzlab_profiles: ficha pública con tus estadísticas (solo la ven tus amigos).
 * - acyzlab_friendships: solicitudes y amistades.
 */
const Social = (() => {
  const db = () => Cloud.client;
  const me = () => Cloud.user;
  let lastPublished = '';

  const displayNameOf = (user, nickname) => {
    const m = (user && user.user_metadata) || {};
    return (nickname || m.full_name || m.name || (user && user.email ? user.email.split('@')[0] : 'Rival')).slice(0, 40);
  };

  /** Sube tu ficha (nombre + estadísticas). Solo si cambió. */
  async function publish(stats, nickname) {
    if (!Cloud.enabled || !me()) return;
    const row = { user_id: me().id, email: (me().email || '').toLowerCase(), display_name: displayNameOf(me(), nickname), stats };
    const key = JSON.stringify(row);
    if (key === lastPublished) return;
    const { error } = await db().from('acyzlab_profiles').upsert({ ...row, updated_at: new Date().toISOString() });
    if (error) { console.warn('No se pudo publicar la ficha', error); return; }
    lastPublished = key;
  }

  /** Carga amigos, solicitudes recibidas y enviadas, con sus fichas. */
  async function load() {
    const uid = me().id;
    const { data: links, error } = await db().from('acyzlab_friendships').select('id, requester, addressee, status, created_at');
    if (error) throw error;
    const others = [...new Set(links.map(l => (l.requester === uid ? l.addressee : l.requester)))];
    let profiles = [];
    const ids = [uid, ...others];
    const { data: prof, error: e2 } = await db().from('acyzlab_profiles').select('user_id, email, display_name, stats, updated_at').in('user_id', ids);
    if (e2) throw e2;
    profiles = prof || [];
    const byId = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    const unknown = id => ({ user_id: id, display_name: 'Rival misterioso', email: '', stats: {} });
    const item = l => {
      const other = l.requester === uid ? l.addressee : l.requester;
      return { id: l.id, since: l.created_at, profile: byId[other] || unknown(other) };
    };
    return {
      me: byId[uid] || null,
      friends: links.filter(l => l.status === 'accepted').map(item),
      incoming: links.filter(l => l.status === 'pending' && l.addressee === uid).map(item),
      outgoing: links.filter(l => l.status === 'pending' && l.requester === uid).map(item),
    };
  }

  async function find(email) {
    const { data, error } = await db().rpc('acyzlab_find_user', { p_email: email });
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  }
  async function request(userId) {
    const { error } = await db().from('acyzlab_friendships').insert({ requester: me().id, addressee: userId });
    if (error) throw error;
  }
  async function accept(id) {
    const { error } = await db().from('acyzlab_friendships').update({ status: 'accepted' }).eq('id', id);
    if (error) throw error;
  }
  async function remove(id) {
    const { error } = await db().from('acyzlab_friendships').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- Entrenar juntos (duelos) ----------
  const DUEL_COLS = 'id, challenger, rival, status, challenger_pct, rival_pct, challenger_done, rival_done, created_at, updated_at';
  async function invite(rivalId) {
    const { data, error } = await db().from('acyzlab_duels').insert({ challenger: me().id, rival: rivalId }).select(DUEL_COLS).single();
    if (error) throw error;
    return data;
  }
  async function getDuel(id) {
    const { data, error } = await db().from('acyzlab_duels').select(DUEL_COLS).eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async function updateDuel(id, fields) {
    const { error } = await db().from('acyzlab_duels').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }
  /** Invitaciones recibidas en los últimos 15 minutos, con el nombre de quien reta. */
  async function pendingInvites() {
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const { data, error } = await db().from('acyzlab_duels').select(DUEL_COLS)
      .eq('rival', me().id).eq('status', 'invited').gte('created_at', since).order('created_at', { ascending: false });
    if (error) throw error;
    if (!data.length) return [];
    const { data: prof } = await db().from('acyzlab_profiles').select('user_id, display_name').in('user_id', data.map(d => d.challenger));
    const names = Object.fromEntries((prof || []).map(p => [p.user_id, p.display_name]));
    return data.map(d => ({ ...d, name: names[d.challenger] || 'Tu rival' }));
  }

  return { publish, load, find, request, accept, remove, displayNameOf, invite, getDuel, updateDuel, pendingInvites };
})();

/*
 * Avisos con la app cerrada (notificaciones push).
 * El servidor es la función acyzlab-push de Supabase (supabase/functions/acyzlab-push).
 */
const Push = (() => {
  const cfg = window.ACYZ_CONFIG || {};
  const fnUrl = () => `${cfg.supabaseUrl}/functions/v1/acyzlab-push`;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const b64ToBytes = s => {
    const pad = '='.repeat((4 - s.length % 4) % 4);
    const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  };

  async function subscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
  }
  /** 'activo' | 'inactivo' | 'bloqueado' | 'no-soportado' | 'instalar' (iPhone sin instalar) */
  async function status() {
    if (isIOS() && !installed()) return 'instalar';
    if (!('PushManager' in window) || !('Notification' in window)) return 'no-soportado';
    if (Notification.permission === 'denied') return 'bloqueado';
    return (await subscription()) ? 'activo' : 'inactivo';
  }
  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('permiso');
    const { data: ses } = await Cloud.client.auth.getSession();
    const token = ses.session && ses.session.access_token;
    const res = await fetch(`${fnUrl()}?kind=key`, { headers: { apikey: cfg.supabaseKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) throw new Error('servidor');
    const { key } = await res.json();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    const j = sub.toJSON();
    const { error } = await Cloud.client.from('acyzlab_push_subs')
      .upsert({ endpoint: j.endpoint, user_id: Cloud.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth });
    if (error) throw error;
  }
  async function disable() {
    const sub = await subscription();
    if (!sub) return;
    await Cloud.client.from('acyzlab_push_subs').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  /** Pide al servidor que avise al rival del reto. */
  async function notifyDuel(id) {
    const { data } = await Cloud.client.auth.getSession();
    const token = data.session && data.session.access_token;
    if (!token) return;
    await fetch(fnUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'duel', id }),
    });
  }
  return { status, enable, disable, notifyDuel };
})();
