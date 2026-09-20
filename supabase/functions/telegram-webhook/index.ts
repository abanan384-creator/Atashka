import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

if (!WEBHOOK_SECRET) {
  throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY
);

async function sendTelegramMessage(
  chatId: number,
  text: string
) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Telegram sendMessage error:", error);
  }
}

Deno.serve(async (req) => {
  try {
    // Проверяем, что webhook действительно пришёл от Telegram
    const incomingSecret = req.headers.get(
      "X-Telegram-Bot-Api-Secret-Token"
    );

    if (incomingSecret !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const update = await req.json();

    const message = update?.message;

    if (!message) {
      return new Response("ok");
    }

    const chatId = message.chat?.id;
    const text = message.text ?? "";

    if (!chatId) {
      return new Response("ok");
    }

    // Обработка ссылки:
    // https://t.me/YOUR_BOT?start=TOKEN
    if (text.startsWith("/start")) {
      const parts = text.trim().split(/\s+/);
      const pairingToken = parts[1];

      // Если человек просто открыл бота без pairing token
      if (!pairingToken) {
        await sendTelegramMessage(
          chatId,
          "Откройте Telegram через ссылку подключения опекуна на платформе."
        );

        return new Response("ok");
      }

      // Ищем соответствующую связь в Supabase
      const { data: guardian, error } = await supabase
        .from("guardian_links")
        .select("*")
        .eq("pairing_token", pairingToken)
        .eq("telegram_connected", false)
        .maybeSingle();

      if (error) {
        console.error("Supabase lookup error:", error);

        await sendTelegramMessage(
          chatId,
          "Не удалось подключить Telegram. Попробуйте ещё раз."
        );

        return new Response("ok");
      }

      if (!guardian) {
        await sendTelegramMessage(
          chatId,
          "Эта ссылка недействительна или уже была использована."
        );

        return new Response("ok");
      }

      // Сохраняем Telegram данные опекуна
      const { error: updateError } = await supabase
        .from("guardian_links")
        .update({
          telegram_chat_id: chatId,
          telegram_username:
            message.from?.username ?? null,
          telegram_first_name:
            message.from?.first_name ?? null,
          telegram_connected: true,
          connected_at: new Date().toISOString(),
        })
        .eq("id", guardian.id);

      if (updateError) {
        console.error(
          "Guardian update error:",
          updateError
        );

        await sendTelegramMessage(
          chatId,
          "Не удалось завершить подключение."
        );

        return new Response("ok");
      }

      const seniorName =
        guardian.senior_name ?? "пользователя";

      await sendTelegramMessage(
        chatId,
        `✅ Вы успешно подключены как опекун ${seniorName}.\n\nТеперь здесь будут приходить уведомления о приёме лекарств и важных событиях.`
      );

      return new Response("ok");
    }

    // Простая тестовая команда
    if (text === "/status") {
      await sendTelegramMessage(
        chatId,
        "✅ Telegram-бот работает и готов получать уведомления."
      );

      return new Response("ok");
    }

    await sendTelegramMessage(
      chatId,
      "Используйте /status для проверки подключения."
    );

    return new Response("ok");
  } catch (error) {
    console.error("Webhook error:", error);

    // Telegram лучше всегда быстро отдавать 200,
    // иначе он будет повторно присылать update.
    return new Response("ok");
  }
});