export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { company = "", name = "", email = "", tel = "" } = body;

  if (!company || !name || !email) {
    return new Response(JSON.stringify({ ok: false, error: "必須項目が不足しています" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const RESEND_API_KEY = env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "Server configuration error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const adminHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <h2 style="color:#0B2A5E;border-bottom:2px solid #B89045;padding-bottom:8px;">お問い合わせがありました</h2>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr>
      <td style="padding:10px 12px;background:#f5f7fa;font-weight:bold;width:30%;border:1px solid #dde3ec;">会社名・屋号</td>
      <td style="padding:10px 12px;border:1px solid #dde3ec;">${escapeHtml(company)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">お名前</td>
      <td style="padding:10px 12px;border:1px solid #dde3ec;">${escapeHtml(name)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">メールアドレス</td>
      <td style="padding:10px 12px;border:1px solid #dde3ec;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">電話番号</td>
      <td style="padding:10px 12px;border:1px solid #dde3ec;">${escapeHtml(tel) || "（未入力）"}</td>
    </tr>
  </table>
  <p style="margin-top:24px;color:#666;font-size:13px;">このメールはWaaap LPのお問い合わせフォームから自動送信されました。</p>
</div>
`;

  const customerHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#0B2A5E;padding:24px 32px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;font-size:20px;margin:0;">お問い合わせありがとうございます</h1>
  </div>
  <div style="padding:32px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
    <p>${escapeHtml(name)} 様</p>
    <p>この度はWaaapへお問い合わせいただき、誠にありがとうございます。<br>
    担当者より2営業日以内にご連絡いたします。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <h3 style="color:#0B2A5E;font-size:14px;">■ お問い合わせ内容の確認</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 10px;background:#f5f7fa;font-weight:bold;width:35%;border:1px solid #dde3ec;">会社名・屋号</td>
        <td style="padding:8px 10px;border:1px solid #dde3ec;">${escapeHtml(company)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">お名前</td>
        <td style="padding:8px 10px;border:1px solid #dde3ec;">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">メールアドレス</td>
        <td style="padding:8px 10px;border:1px solid #dde3ec;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;background:#f5f7fa;font-weight:bold;border:1px solid #dde3ec;">電話番号</td>
        <td style="padding:8px 10px;border:1px solid #dde3ec;">${escapeHtml(tel) || "（未入力）"}</td>
      </tr>
    </table>
    <p style="margin-top:24px;font-size:13px;color:#666;">
      ※ このメールは自動送信されています。返信はできません。<br>
      ※ お急ぎの場合はお電話にてお問い合わせください。
    </p>
    <div style="margin-top:24px;padding:16px;background:#f5f7fa;border-radius:6px;font-size:13px;color:#666;">
      <strong style="color:#0B2A5E;">合同会社Waaap</strong><br>
      相続案件獲得支援サービス<br>
      <a href="https://lp.waaap.jp" style="color:#1a6fc4;">https://lp.waaap.jp</a>
    </div>
  </div>
</div>
`;

  const sendEmail = async (to, subject, html) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@mail.waaap.jp",
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  };

  const [adminOk, customerOk] = await Promise.all([
    sendEmail(
      "zenshiren06@gmail.com",
      "【Waaap】お問い合わせがありました",
      adminHtml
    ),
    sendEmail(
      email,
      "お問い合わせありがとうございます｜Waaap",
      customerHtml
    ),
  ]);

  if (!adminOk && !customerOk) {
    return new Response(JSON.stringify({ ok: false, error: "メール送信に失敗しました" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
