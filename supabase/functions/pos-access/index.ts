import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' };
const allowed = ['inventory', 'sell', 'sales', 'customers', 'labels', 'reports'];
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const ensure = (result: any) => { if (result.error) throw new Error(result.error.message); return result.data; };
const safePermissions = (input: unknown) => Array.from(new Set(['inventory', ...(Array.isArray(input) ? input.filter(p => allowed.includes(p)) : [])]));
const cleanSale = (sale: any, financial: boolean) => { const copy = { ...sale }; if (!financial) { delete copy.cost; delete copy.profit; } return copy; };
async function proof(id: string, secret: string, pin: string) {
  const enc = new TextEncoder();
  const hmac = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', hmac, enc.encode(JSON.stringify([id, secret, pin])));
  return Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2, '0')).join('');
}
async function member(db: any, user: any) {
  if (user?.app_metadata?.role === 'ADMIN') return { id: user.id, name: 'Administrator', username: user.email, role: 'ADMIN', status: 'ACTIVE', permissions: allowed, dateCreated: user.created_at };
  const row = ensure(await db.from('pos_staff').select('*').eq('user_id', user.id).maybeSingle());
  if (!row?.active) throw new Error('This account has no active workspace access.');
  return { id: user.id, name: row.name, username: row.username, role: 'EMPLOYEE', status: 'ACTIVE', permissions: row.permissions, dateCreated: row.created_at };
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    if (Number(req.headers.get('content-length') || 0) > 65536) return reply({ error: 'Request too large' }, 413);
    const body = await req.json(); const db = client();
    // Opaque device ID only: return availability, never identity or session data.
    if (body.action === 'pin-status') {
      if (!/^[0-9a-f-]{36}$/.test(body.deviceId || '')) return reply({ available: false });
      const device = ensure(await db.from('pos_pin_devices').select('user_id,attempts').eq('id', body.deviceId).maybeSingle());
      if (!device || device.attempts >= 5) return reply({ available: false });
      const target = ensure(await db.auth.admin.getUserById(device.user_id)).user;
      if (!target || (target.banned_until && new Date(target.banned_until) > new Date())) return reply({ available: false });
      if (target.app_metadata?.role === 'ADMIN') return reply({ available: true });
      const staff = ensure(await db.from('pos_staff').select('active').eq('user_id', device.user_id).maybeSingle());
      return reply({ available: staff?.active === true });
    }
    // This route uses a registered-device secret AND a rate-limited PIN, not an anonymous JWT.
    if (body.action === 'unlock') {
      if (!/^[0-9]{6}$/.test(body.pin || '') || typeof body.secret !== 'string' || body.secret.length !== 64 || !/^[0-9a-f-]{36}$/.test(body.deviceId || '')) return reply({ error: 'PIN unavailable. Sign in with your password.' }, 401);
      const attempt = ensure(await db.rpc('pos_claim_pin', { p_id: body.deviceId, p_proof: await proof(body.deviceId, body.secret, body.pin) }));
      if (!attempt.ok) return reply({ error: 'Incorrect PIN, unregistered device, or PIN locked after 5 attempts. Use your password to register this device again.' }, 401);
      const user = ensure(await db.auth.admin.getUserById(attempt.user_id)).user;
      await member(db, user);
      if (!user.email || (user.banned_until && new Date(user.banned_until) > new Date())) throw new Error('Account disabled');
      // Creates a one-use server-side sign-in token. No email is sent and no password is stored.
      const link = ensure(await db.auth.admin.generateLink({ type: 'magiclink', email: user.email }));
      const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const signed = ensure(await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }));
      return reply({ session: signed.session });
    }
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user) return reply({ error: 'Please sign in again.' }, 401);
    const user = auth.data.user; const account = await member(db, user);
    const isAdmin = account.role === 'ADMIN';
    if (body.action === 'me') return reply(account);
    if (body.action === 'pin-list') {
      return reply(ensure(await db.from('pos_pin_devices').select('id,name,created_at,expires_at,attempts').eq('user_id', user.id)));
    }
    if (body.action === 'pin-remove') {
      ensure(await db.from('pos_pin_devices').delete().eq('id', body.deviceId).eq('user_id', user.id)); return reply({ ok: true });
    }
    if (body.action === 'pin-enroll') {
      if (!/^[0-9]{6}$/.test(body.pin || '') || /^(.)\1{5}$/.test(body.pin) || ['123456', '654321'].includes(body.pin)) throw new Error('Choose a less predictable 6-digit PIN.');
      const reauth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const checked = await reauth.auth.signInWithPassword({ email: user.email!, password: String(body.password || '') });
      if (checked.error || checked.data.user?.id !== user.id) throw new Error('Current password is incorrect.');
      await reauth.auth.signOut({ scope: 'local' });
      const id = crypto.randomUUID();
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      ensure(await db.rpc('pos_enroll_pin', { p_id: id, p_user: user.id, p_name: String(body.name || 'My device').slice(0, 80), p_proof: await proof(id, secret, body.pin) }));
      return reply({ deviceId: id, secret, name: account.name });
    }
    if (body.action === 'data') {
      const financial = isAdmin || account.permissions.includes('reports');
      const rows = async (table: string) => ensure(await db.from(table).select(table === 'items' ? 'data,quantity' : 'data')).map((r: any) => table === 'items' ? { ...r.data, quantity: r.quantity } : r.data);
      const [items, categories, sales, customers] = await Promise.all([rows('items'), rows('categories'), account.permissions.some((p: string) => ['sales','reports','customers'].includes(p)) ? rows('sales') : [], account.permissions.includes('customers') ? rows('customers') : []]);
      return reply({ items: items.filter((i: any) => isAdmin || i.status !== 'DELETED').map((i: any) => { const copy = { ...i }; if (!financial) delete copy.costPrice; if (!isAdmin && !account.permissions.includes('customers')) for (const k of ['soldCustomerId','soldCustomerName','soldCustomerPhone','soldNote']) delete copy[k]; return copy; }), categories, sales: sales.map((s: any) => { const copy = cleanSale(s, financial); if (!isAdmin && !account.permissions.includes('customers')) { copy.customerName = 'Customer'; copy.customerPhone = ''; delete copy.note; } return copy; }), customers, customer_requests: [] });
    }
    if (body.action === 'checkout') {
      if (isAdmin || !account.permissions.includes('sell')) throw new Error('Sales access is not permitted.');
      const sales = ensure(await db.rpc('pos_staff_checkout', { p_user: user.id, p_request: body.requestId, p_lines: body.lines, p_name: String(body.name || '').slice(0, 200), p_phone: String(body.phone || '').slice(0, 40), p_note: String(body.note || '').slice(0, 2000) }));
      return reply({ sales: sales.map((s: any) => cleanSale(s, account.permissions.includes('reports'))) });
    }
    if (!isAdmin) return reply({ error: 'Administrator access is required.' }, 403);
    if (body.action === 'staff-list') return reply(ensure(await db.from('pos_staff').select('*').order('created_at')));
    if (body.action === 'staff-create') {
      const username = String(body.username || '').trim().toLowerCase(); const name = String(body.name || '').trim();
      if (!/^[a-z0-9_]{3,32}$/.test(username) || !name || String(body.password || '').length < 6) throw new Error('Use a 3–32 character username and a password of at least 6 characters.');
      const created = ensure(await db.auth.admin.createUser({ email: `${username}@staff.wdjlanka.invalid`, password: body.password, email_confirm: true, app_metadata: { role: 'EMPLOYEE' } })).user;
      const saved = await db.from('pos_staff').insert({ user_id: created.id, username, name: name.slice(0, 120), permissions: safePermissions(body.permissions) });
      if (saved.error) { await db.auth.admin.deleteUser(created.id); throw new Error('Unable to create staff account. The username may already exist.'); }
      return reply({ ok: true });
    }
    if (body.action === 'staff-update') {
      const row = ensure(await db.from('pos_staff').select('user_id').eq('user_id', body.userId).single());
      if (row.user_id === user.id) throw new Error('Cannot change your own administrator access.');
      ensure(await db.from('pos_staff').update({ active: body.active === true, permissions: safePermissions(body.permissions) }).eq('user_id', row.user_id));
      // Revoking staff access takes effect on every subsequent server request.
      if (!body.active) ensure(await db.from('pos_pin_devices').delete().eq('user_id', row.user_id));
      return reply({ ok: true });
    }
    if (body.action === 'staff-delete') {
      const row = ensure(await db.from('pos_staff').select('user_id').eq('user_id', body.userId).single());
      const target = ensure(await db.auth.admin.getUserById(row.user_id)).user;
      if (row.user_id === user.id || target.app_metadata?.role === 'ADMIN') throw new Error('Administrator accounts cannot be deleted here.');
      // Disable first: existing JWTs cannot authorize subsequent workspace requests.
      ensure(await db.from('pos_staff').update({ active: false }).eq('user_id', row.user_id));
      ensure(await db.from('pos_pin_devices').delete().eq('user_id', row.user_id));
      ensure(await db.auth.admin.deleteUser(row.user_id));
      return reply({ ok: true });
    }
    if (body.action === 'staff-password') {
      const row = ensure(await db.from('pos_staff').select('user_id').eq('user_id', body.userId).single());
      if (String(body.password || '').length < 6) throw new Error('Password must have at least 6 characters.');
      ensure(await db.auth.admin.updateUserById(row.user_id, { password: body.password }));
      ensure(await db.from('pos_pin_devices').delete().eq('user_id', row.user_id));
      return reply({ ok: true });
    }
    return reply({ error: 'Unknown action' }, 400);
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Unable to complete this request.' }, 400); }
});
