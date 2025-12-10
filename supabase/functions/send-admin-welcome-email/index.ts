import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminWelcomeEmailRequest {
  adminName: string;
  adminEmail: string;
  password: string;
  schoolName?: string;
  planName?: string;
  maxStudents?: number;
  isPasswordReset?: boolean;
  onboardingPdfUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      adminName,
      adminEmail,
      password,
      schoolName,
      planName,
      maxStudents,
      isPasswordReset = false,
      onboardingPdfUrl,
    }: AdminWelcomeEmailRequest = await req.json();

    if (!adminName || !adminEmail || !password) {
      return new Response(
        JSON.stringify({ error: "Nome, email e senha são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://klase.app";
    const firstName = adminName.split(" ")[0];

    // Different subject and intro based on whether it's a new account or password reset
    const subject = isPasswordReset
      ? "🔑 Sua nova senha do Klase"
      : "🎉 Bem-vindo(a) ao Klase!";

    const introText = isPasswordReset
      ? `Olá ${firstName}, sua senha foi redefinida com sucesso.`
      : `Olá ${firstName}, sua conta de administrador foi criada com sucesso!`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f0f23;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 520px; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.2);">
              <div style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Klase
              </div>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">
                Plataforma Educacional Gamificada
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${isPasswordReset ? "Nova Senha Gerada" : "Bem-vindo(a)!"}
              </h1>
              
              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px; line-height: 1.6;">
                ${introText}
              </p>

              <!-- Credentials Box -->
              <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="color: #a78bfa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                  🔐 Credenciais de Acesso
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #9ca3af; font-size: 13px;">Email:</span>
                      <div style="color: #ffffff; font-size: 15px; font-weight: 500; margin-top: 2px;">
                        ${adminEmail}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-top: 1px solid rgba(139, 92, 246, 0.2);">
                      <span style="color: #9ca3af; font-size: 13px;">Senha:</span>
                      <div style="color: #ffffff; font-size: 15px; font-weight: 500; font-family: 'SF Mono', Monaco, monospace; margin-top: 2px; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; display: inline-block;">
                        ${password}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              ${!isPasswordReset && planName ? `
              <!-- Plan Info Box -->
              <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="color: #60a5fa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                  📋 Seu Plano
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 4px 0;">
                      <span style="color: #9ca3af; font-size: 13px;">Plano:</span>
                      <span style="color: #ffffff; font-size: 15px; font-weight: 500; margin-left: 8px;">${planName}</span>
                    </td>
                  </tr>
                  ${maxStudents ? `
                  <tr>
                    <td style="padding: 4px 0;">
                      <span style="color: #9ca3af; font-size: 13px;">Capacidade:</span>
                      <span style="color: #ffffff; font-size: 15px; font-weight: 500; margin-left: 8px;">até ${maxStudents} alunos</span>
                    </td>
                  </tr>
                  ` : ''}
                  ${schoolName ? `
                  <tr>
                    <td style="padding: 4px 0;">
                      <span style="color: #9ca3af; font-size: 13px;">Escola:</span>
                      <span style="color: #ffffff; font-size: 15px; font-weight: 500; margin-left: 8px;">${schoolName}</span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              ` : ''}

              ${onboardingPdfUrl ? `
              <!-- Onboarding PDF Link -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${onboardingPdfUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; color: #a78bfa; font-size: 14px; text-decoration: none;">
                  📄 Baixar Guia de Primeiros Passos (PDF)
                </a>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${appUrl}/login" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                  Acessar o Klase
                </a>
              </div>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                Recomendamos que você altere sua senha após o primeiro acesso.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                Este é um email automático do Klase. Se você não solicitou esta conta, por favor ignore este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    console.log(`Sending admin ${isPasswordReset ? 'password reset' : 'welcome'} email to ${adminEmail}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Klase <noreply@sistema.klasetech.com>",
        to: [adminEmail],
        subject: subject,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Failed to send email" }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
