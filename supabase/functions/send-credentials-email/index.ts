import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CredentialsEmailRequest {
  to: string;
  studentName: string;
  email: string;
  password: string;
  schoolName?: string;
  isGuardian?: boolean;
  guardianName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      studentName, 
      email, 
      password, 
      schoolName = "Klase",
      isGuardian = false,
      guardianName
    }: CredentialsEmailRequest = await req.json();

    console.log(`Sending credentials email to: ${to} for student: ${studentName}`);

    if (!to || !studentName || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, studentName, email, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const greeting = isGuardian && guardianName 
      ? `Olá, ${guardianName}!` 
      : `Olá, ${studentName}!`;

    const introText = isGuardian
      ? `A conta do(a) aluno(a) <strong>${studentName}</strong> foi criada com sucesso no ${schoolName}.`
      : `Sua conta foi criada com sucesso no ${schoolName}.`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Klase</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #a855f7;">
                Klase
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; padding: 32px;">
              
              <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                ${greeting}
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #a1a1aa; line-height: 1.5;">
                ${introText}
              </p>
              
              <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 0.5px;">
                  Credenciais de Acesso
                </p>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 14px; color: #71717a;">Email:</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 0 16px 0;">
                      <span style="font-size: 16px; color: #ffffff; font-weight: 500; word-break: break-all;">${email}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 14px; color: #71717a;">Senha:</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0;">
                      <span style="font-size: 16px; color: #ffffff; font-weight: 500; font-family: monospace; background: rgba(168, 85, 247, 0.2); padding: 4px 8px; border-radius: 4px;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://klase.app/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Acessar Klase
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #71717a; text-align: center; line-height: 1.5;">
                Por segurança, recomendamos alterar sua senha no primeiro acesso.
              </p>
              
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                © ${new Date().getFullYear()} Klase. Todos os direitos reservados.
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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Klase <onboarding@resend.dev>",
        to: [to],
        subject: isGuardian 
          ? `Credenciais de acesso de ${studentName} - Klase`
          : `Bem-vindo ao Klase, ${studentName}!`,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData.message || "Email sending failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-credentials-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
