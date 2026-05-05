// supabase/functions/notify-telegram/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();

    const {
      pcCode,
      pcName,
      reportMonth,
      reportYear,
      rowCount,
      submissionId,
    } = body;

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    const DASHBOARD_URL = Deno.env.get("DASHBOARD_URL");

    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(
        JSON.stringify({ error: "Missing Telegram config" }),
        { status: 500 }
      );
    }

    const message = `
📌 Báo cáo mới đã được gửi

Đơn vị: ${pcName} (${pcCode})
Kỳ báo cáo: Tháng ${reportMonth}/${reportYear}
Số dòng đối tác: ${rowCount}
Mã submission: ${submissionId ?? "N/A"}

Dashboard:
${DASHBOARD_URL ?? ""}
    `.trim();

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
        }),
      }
    );

    const telegramData = await telegramRes.json();

    return new Response(JSON.stringify(telegramData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});