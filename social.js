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

  return { publish, load, find, request, accept, remove, displayNameOf };
})();
