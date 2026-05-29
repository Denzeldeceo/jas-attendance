// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS QUERY to your existing api/admin/records.js
// Inside your handler, alongside your existing today/history queries,
// add the deviceLocks fetch and include it in the response.
// ─────────────────────────────────────────────────────────────────────────────

// Paste this block into your records.js handler:

  const today = new Date().toISOString().slice(0, 10);

  // ... your existing today + history queries ...

  // ── Fetch today's device locks for the admin panel table ──────────────────
  const { data: lockRows } = await supabase
    .from('device_locks')
    .select('device_id, employee_name, locked_at')
    .eq('date', today)
    .order('locked_at', { ascending: true });

  const deviceLocks = (lockRows || []).map(l => ({
    deviceId:     l.device_id,
    employeeName: l.employee_name,
    lockedAt:     l.locked_at || '—',
  }));

  // ── Include deviceLocks in your existing return statement ─────────────────
  return res.status(200).json({
    today:       /* your existing today array */,
    history:     /* your existing history array */,
    deviceLocks,           // ← add this line
  });
