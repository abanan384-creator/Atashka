import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);

    // GET /create-guardian-invite?guardianLinkId=... OR ?userId=...
    if (req.method === "GET") {
      const guardianLinkId = url.searchParams.get("guardianLinkId");
      const userId = url.searchParams.get("userId");

      if (!guardianLinkId && !userId) {
        return new Response(
          JSON.stringify({ error: "guardianLinkId or userId parameter is required" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      let query = supabase
        .from("guardian_links")
        .select("id, user_id, senior_name, pairing_token, telegram_connected, telegram_first_name, telegram_username, connected_at");

      if (guardianLinkId) {
        query = query.eq("id", guardianLinkId);
      } else if (userId) {
        query = query.eq("user_id", userId).eq("telegram_connected", true).order("connected_at", { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Lookup error:", error);
        return new Response(
          JSON.stringify({ error: "Database error", details: error.message }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!data) {
        return new Response(
          JSON.stringify({ connected: false, guardian: null }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          guardianLinkId: data.id,
          connected: Boolean(data.telegram_connected),
          telegramFirstName: data.telegram_first_name,
          telegramUsername: data.telegram_username,
          connectedAt: data.connected_at,
          pairingToken: data.pairing_token,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // POST /create-guardian-invite
    if (req.method === "POST") {
      let body: { userId?: string; seniorName?: string; replace?: boolean } = {};
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { userId, seniorName, replace } = body;

      if (!userId || typeof userId !== "string") {
        return new Response(
          JSON.stringify({ error: "userId is required and must be a string" }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Check if user already has a connected guardian and didn't explicitly request to replace
      if (!replace) {
        const { data: existingConnected } = await supabase
          .from("guardian_links")
          .select("id, pairing_token, telegram_connected, telegram_first_name, telegram_username")
          .eq("user_id", userId)
          .eq("telegram_connected", true)
          .order("connected_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingConnected) {
          return new Response(
            JSON.stringify({
              guardianLinkId: existingConnected.id,
              alreadyConnected: true,
              telegramFirstName: existingConnected.telegram_first_name,
              telegramUsername: existingConnected.telegram_username,
              telegramUrl: `https://t.me/CareTrackGuardianBot?start=${existingConnected.pairing_token}`,
            }),
            {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }

      // If replacing or requesting new invite, clean up uncompleted tokens for this user
      await supabase
        .from("guardian_links")
        .delete()
        .eq("user_id", userId)
        .eq("telegram_connected", false);

      // Generate secure pairing token safe for Telegram start parameter (letters, digits, underscores)
      const tokenSuffix = crypto.randomUUID().replace(/-/g, "");
      const pairingToken = `gt_${tokenSuffix}`;

      const { data, error } = await supabase
        .from("guardian_links")
        .insert({
          user_id: userId,
          senior_name: seniorName?.trim() || "Пользователь",
          pairing_token: pairingToken,
          telegram_connected: false,
        })
        .select("id, pairing_token")
        .single();

      if (error) {
        console.error("Failed to insert guardian link:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create guardian invite", details: error.message }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const telegramUrl = `https://t.me/CareTrackGuardianBot?start=${pairingToken}`;

      return new Response(
        JSON.stringify({
          guardianLinkId: data.id,
          pairingToken: data.pairing_token,
          telegramUrl,
          alreadyConnected: false,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unhandled error in create-guardian-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
