// Supabase Edge Function: securely delivers an already-authorised in-app
// notification to every registered device of its recipient.
// Secrets required in Supabase: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (for example mailto:it@geoinformatics.com).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:it@geoinformatics.com';
  if (!vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ delivered: false, reason: 'Push is not configured.' }, { status: 503, headers: corsHeaders });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const { notificationId } = await request.json().catch(() => ({}));
  if (!notificationId || typeof notificationId !== 'string') {
    return Response.json({ error: 'notificationId is required.' }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(url, serviceRoleKey);
  const { data: document, error: documentError } = await admin
    .from('company_data_documents')
    .select('payload')
    .eq('kind', 'notification')
    .eq('document_id', notificationId)
    .maybeSingle();
  if (documentError || !document) return new Response('Notification not found', { status: 404, headers: corsHeaders });

  const notification = document.payload as Record<string, unknown>;
  // Only the original workflow caller can trigger delivery. The document itself
  // was already subject to RLS when it was created in the browser.
  if (notification.createdBy !== caller.id) return new Response('Forbidden', { status: 403, headers: corsHeaders });

  let subscriptionsQuery = admin.from('push_subscriptions').select('id, endpoint, subscription');
  subscriptionsQuery = notification.userId === 'all'
    ? subscriptionsQuery
    : subscriptionsQuery.eq('user_id', notification.userId as string);
  const { data: subscriptions } = await subscriptionsQuery;
  if (!subscriptions?.length) return Response.json({ delivered: true, sent: 0 }, { headers: corsHeaders });

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({
    title: notification.titleEn || 'Geoinformatics',
    body: notification.messageEn || '',
    titleAr: notification.titleAr || '',
    bodyAr: notification.messageAr || '',
    actionUrl: notification.actionUrl || '/',
    notificationId,
  });
  const settled = await Promise.allSettled(subscriptions.map((entry) =>
    webpush.sendNotification(entry.subscription as webpush.PushSubscription, payload, { TTL: 60 * 60 * 12 })
  ));

  const staleIds = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    const statusCode = (result.reason as { statusCode?: number })?.statusCode;
    return statusCode === 404 || statusCode === 410 ? [subscriptions[index].id] : [];
  });
  if (staleIds.length) await admin.from('push_subscriptions').delete().in('id', staleIds);

  return Response.json({ delivered: true, sent: settled.filter((result) => result.status === 'fulfilled').length }, { headers: corsHeaders });
});
