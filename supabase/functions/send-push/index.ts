import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { toUserId, title, body, data } = await req.json();

    if (!toUserId || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Persist notification so the user can see it in the app
    await supabase.from("notifications").insert({
      user_id: toUserId,
      title,
      body,
      data: data ?? {},
    });

    // Fetch all push tokens for this user
    const { data: rows, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", toUserId);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const messages = rows.map((r: { token: string }) => ({
      to: r.token,
      sound: "default",
      title,
      body,
      data: data ?? {},
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const result = await res.json();

    // Remove tokens that are no longer valid (device changed, app uninstalled, etc.)
    const invalidTokens: string[] = [];
    const ticketArray = Array.isArray(result.data) ? result.data : [];
    ticketArray.forEach((ticket: { status: string; details?: { error?: string } }, i: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(rows[i].token);
      }
    });
    if (invalidTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", invalidTokens);
    }

    return new Response(JSON.stringify({ sent: messages.length, result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
