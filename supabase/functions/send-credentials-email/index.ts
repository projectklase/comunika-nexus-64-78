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

    // Saudação dinâmica
    const greeting = isGuardian && guardianName 
      ? `Olá, ${guardianName}!` 
      : `Olá, ${studentName}!`;

    // Intro dinâmica baseada se é guardian ou aluno direto
    const introText = isGuardian
      ? `A conta de <strong>${studentName}</strong> foi criada na aliança entre a <strong>${schoolName}</strong> e o Klase. Abaixo estão as credenciais de acesso.`
      : `Seja muito bem-vindo à aliança entre a <strong>${schoolName}</strong> e o Klase.<br><br>Você acaba de desbloquear o acesso ao seu novo <strong>Quartel-General Digital</strong>. O Klase não é apenas uma plataforma; é o lugar onde o seu esforço em sala de aula se transforma em conquistas reais.`;

    // Assunto do email - magnético
    const subject = isGuardian 
      ? `Credenciais de acesso de ${studentName} - ${schoolName}`
      : `${studentName}, seu acesso oficial ao Klase foi liberado! 🔓`;

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
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- HEADER: Klase | Escola -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #a855f7; display: inline;">
                Klase
              </h1>
              <span style="color: #52525b; font-size: 24px; margin: 0 12px;">|</span>
              <span style="color: #ffffff; font-size: 20px; font-weight: 500;">${schoolName}</span>
            </td>
          </tr>
          
          <!-- CARD PRINCIPAL -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; padding: 32px;">
              
              <!-- HEADLINE -->
              <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #ffffff; line-height: 1.4;">
                Chegou a hora de levar o seu aprendizado para o próximo nível.
              </h2>
              
              <!-- SAUDAÇÃO -->
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #ffffff; font-weight: 500;">
                ${greeting}
              </p>
              
              <!-- INTRO -->
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
                ${introText}
              </p>
              
              <!-- O QUE TE ESPERA -->
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 0.5px;">
                  O que te espera lá dentro?
                </p>
                
                <div style="margin: 16px 0;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #d4d4d8; line-height: 1.5;">
                    🚀 <strong style="color: #ffffff;">Evolução Constante:</strong> Acompanhe seu progresso aula a aula.
                  </p>
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #d4d4d8; line-height: 1.5;">
                    🏆 <strong style="color: #ffffff;">Reconhecimento:</strong> Cada atividade conta. Sua dedicação te coloca em destaque.
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #d4d4d8; line-height: 1.5;">
                    🎮 <strong style="color: #ffffff;">Gamificação Inteligente:</strong> Conquiste níveis, desbloqueie medalhas e veja o quanto você já cresceu.
                  </p>
                </div>
              </div>
              
              <!-- FRASE HÍBRIDA -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.5; font-style: italic;">
                Seja você um jovem explorador ou um profissional focado, o Klase foi feito para tornar sua experiência na ${schoolName} inesquecível.
              </p>
              
              <!-- CREDENCIAIS -->
              <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 600; color: #a855f7; text-transform: uppercase; letter-spacing: 0.5px;">
                  🔑 Suas Chaves de Acesso
                </p>
                
                <!-- EMAIL -->
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                  Email
                </p>
                <div style="background: #1a1a1b; padding: 14px 16px; border-radius: 8px; border: 1px solid #333; margin-bottom: 16px;">
                  <code style="color: #ffffff; font-size: 15px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; word-break: break-all; -webkit-user-select: all; user-select: all;">${email}</code>
                </div>
                
                <!-- SENHA -->
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                  Senha Temporária
                </p>
                <div style="background: #1a1a1b; padding: 14px 16px; border-radius: 8px; border: 2px solid #a855f7; margin-bottom: 12px;">
                  <code style="color: #ffffff; font-size: 16px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; letter-spacing: 1px; -webkit-user-select: all; user-select: all;">${password}</code>
                </div>
                
                <p style="margin: 0; font-size: 12px; color: #71717a;">
                  💡 Dica: Toque e segure para copiar no celular
                </p>
              </div>
              
              <!-- DICA DE SEGURANÇA -->
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 12px 16px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                🔒 <strong>Dica de Segurança:</strong> Recomendamos alterar sua senha no primeiro acesso.
              </p>
              
              <!-- CTA BUTTON -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://app.klasetech.com" 
                       style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 40px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);">
                      Acessar Meu Perfil Agora
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- ASSINATURA -->
              <p style="margin: 28px 0 0 0; font-size: 14px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                Estamos prontos para ver você brilhar.<br>
                <strong style="color: #ffffff;">Equipe Klase & ${schoolName}</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- RODAPÉ -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #52525b;">
                © ${new Date().getFullYear()} Klase. Todos os direitos reservados.
              </p>
              <p style="margin: 0; font-size: 12px; color: #71717a;">
                Precisa de ajuda? Fale com a secretaria da ${schoolName}.
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
        from: "Klase <noreply@sistema.klasetech.com>",
        to: [to],
        subject,
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
