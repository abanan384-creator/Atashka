import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type NotificationType =
  | "medication_taken"
  | "medication_snoozed"
  | "medication_unconfirmed"
  | "schedule_updated"
  | "game_completed";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    const {
      guardianLinkId,
      userId,
      type,
      seniorName,
      medication,
      time,
    } = await req.json();

    if ((!guardianLinkId && !userId) || !type) {
      return Response.json(
        {
          error: "guardianLinkId or userId, and type are required",
        },
        { status: 400 }
      );
    }

    let query = supabase
      .from("guardian_links")
      .select("telegram_chat_id, telegram_connected")
      .eq("telegram_connected", true);

    if (guardianLinkId) {
      query = query.eq("id", guardianLinkId);
    } else if (userId) {
      query = query.eq("user_id", userId).order("connected_at", { ascending: false }).limit(1);
    }

    const { data: guardian, error } = await query.maybeSingle();

    if (error) {
      console.error(error);

      return Response.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!guardian?.telegram_chat_id) {
      return Response.json(
        {
          error:
            "Guardian Telegram is not connected",
        },
        { status: 404 }
      );
    }

    const name = seniorName || "Пользователь";

    let message = "";

    switch (type as NotificationType) {
      case "medication_taken":
        message =
          `💊 ${name} подтвердил(а) приём лекарства\n\n` +
          `${medication || "Лекарство"}` +
          `${time ? ` · ${time}` : ""}`;
        break;

      case "medication_snoozed":
        message =
          `⏰ ${name} пока не принял(а) лекарство\n\n` +
          `${medication || "Лекарство"}\n` +
          `Повторное напоминание через 5 минут.`;
        break;

      case "medication_unconfirmed":
        message =
          `⚠️ Нет подтверждения приёма лекарства\n\n` +
          `${medication || "Лекарство"}` +
          `${time ? ` · ${time}` : ""}\n\n` +
          `${name} пока не подтвердил(а) приём.`;
        break;

      case "schedule_updated":
        message =
          `📋 ${name} обновил(а) расписание лекарств.`;
        break;

      case "game_completed":
        message =
          `🧠 ${name} завершил(а) упражнение для памяти.`;
        break;

      default:
        return Response.json(
          { error: "Unknown notification type" },
          { status: 400 }
        );
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          chat_id: guardian.telegram_chat_id,
          text: message,
        }),
      }
    );

    const telegramResult =
      await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error(
        "Telegram error:",
        telegramResult
      );

      return Response.json(
        {
          error: "Telegram send failed",
          details: telegramResult,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        sent: true,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Internal error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});