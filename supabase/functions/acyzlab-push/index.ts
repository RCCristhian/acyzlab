// Acyz Lab: servidor de avisos (notificaciones push).
//
//   GET  ?kind=key                 → clave pública para suscribirse a los avisos
//   POST { kind: 'duel', id }      → avisa al rival de que le han retado (requiere sesión del que reta)
//   POST { kind: 'quests' }        → (cada 10 min, desde pg_cron) avisa de misiones sorpresa
//
// Las claves VAPID se crean solas la primera vez y se guardan en la tabla privada
// acyzlab_push_keys (sin reglas de acceso: solo este servidor puede leerla).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.110.0';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = 'https://rccristhian.github.io/acyzlab/';
const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------- claves y envío ----------
async function vapid() {
  const { data } = await db.from('acyzlab_push_keys').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  const row = { id: 1, public_key: k.publicKey, private_key: k.privateKey };
  const { error } = await db.from('acyzlab_push_keys').insert(row);
  if (error) { // otra llamada las creó a la vez
    const again = await db.from('acyzlab_push_keys').select('public_key, private_key').eq('id', 1).single();
    return again.data!;
  }
  return row;
}

async function sendTo(userId: string, payload: Record<string, unknown>) {
  const k = await vapid();
  webpush.setVapidDetails(APP_URL, k.public_key, k.private_key);
  const { data: subs } = await db.from('acyzlab_push_subs').select('endpoint, p256dh, auth').eq('user_id', userId);
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('acyzlab_push_subs').delete().eq('endpoint', s.endpoint); // suscripción caducada
      else console.warn('push error', code);
    }
  }
  return sent;
}

// evita avisar dos veces de lo mismo
async function once(key: string) {
  const { error } = await db.from('acyzlab_push_log').insert({ key });
  return !error;
}

// ---------- misiones sorpresa (misma lógica que leveling.js) ----------
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function local(date: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hour: +p.hour, minute: +p.minute };
}

// deno-lint-ignore no-explicit-any
function questDue(userId: string, data: any, now: Date) {
  const history = data?.history || [];
  if (!data?.profile || !history.length) return null;
  const tz = data?.settings?.tz || 'America/Lima';
  const hours = history.slice(-6).map((h: { date: string }) => local(new Date(h.date), tz).hour);
  const avg = hours.reduce((a: number, b: number) => a + b, 0) / hours.length;
  const win = avg >= 15 ? { from: 5, to: 9 } : { from: 19, to: 24 };
  const t = local(now, tz);
  if (t.hour < win.from || t.hour >= win.to) return null;
  const q = (data.quests || []).find((x: { date: string }) => x.date === t.ymd);
  if (q && (q.status === 'completada' || q.status === 'ninguna' || q.status === 'fallida' || q.shown)) return null;
  const rand = rng(hashString(t.ymd + '|' + userId));
  const recent = history.filter((h: { date: string }) => now.getTime() - new Date(h.date).getTime() < 2 * 864e5);
  const light = recent.some((h: { feedback?: string; minutes?: number }) => h.feedback === 'facil' || (h.minutes || 0) < 20);
  if (rand() > (light ? 0.7 : 0.35)) return null;
  const startMin = win.from * 60, endMin = win.to === 24 ? 23 * 60 + 59 : win.to * 60;
  const appearMin = startMin + rand() * Math.max(0, endMin - startMin - 75);
  if (t.hour * 60 + t.minute < appearMin) return null;
  return { date: t.ymd, until: win.to === 24 ? 'medianoche' : `las ${win.to}:00` };
}

async function runQuests() {
  const { data: subs } = await db.from('acyzlab_push_subs').select('user_id');
  const users = [...new Set((subs || []).map(s => s.user_id))];
  const now = new Date();
  let sent = 0;
  for (const uid of users) {
    const { data: row } = await db.from('acyzlab_user_data').select('data').eq('user_id', uid).maybeSingle();
    const due = questDue(uid, row?.data, now);
    if (!due || !(await once(`quest:${uid}:${due.date}`))) continue;
    sent += await sendTo(uid, {
      title: '⚠ ¡Misión sorpresa!',
      body: `Ha aparecido una misión para subir tu personaje. Complétala antes de ${due.until}.`,
      url: APP_URL, tag: 'quest-' + due.date,
    });
  }
  return { users: users.length, sent };
}

// ---------- duelos ----------
async function notifyDuel(req: Request, id: number) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(jwt);
  if (!auth?.user) return json({ error: 'Sin sesión' }, 401);
  const { data: duel } = await db.from('acyzlab_duels').select('id, challenger, rival, status').eq('id', id).maybeSingle();
  if (!duel || duel.challenger !== auth.user.id || duel.status !== 'invited') return json({ error: 'Duelo no válido' }, 403);
  if (!(await once(`duel:${id}`))) return json({ sent: 0 });
  const { data: prof } = await db.from('acyzlab_profiles').select('display_name').eq('user_id', duel.challenger).maybeSingle();
  const name = prof?.display_name || 'Tu rival';
  const sent = await sendTo(duel.rival, {
    title: '⚔ ¡Te han retado!',
    body: `${name} te reta a entrenar juntos. Abre Acyz Lab para aceptar.`,
    url: APP_URL, tag: 'duel-' + id,
  });
  return json({ sent });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.get('kind') === 'key') return json({ key: (await vapid()).public_key });
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.kind === 'duel') return await notifyDuel(req, Number(body.id));
      if (body.kind === 'quests') return json(await runQuests());
    }
    return json({ error: 'Petición no válida' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'Error del servidor' }, 500);
  }
});
