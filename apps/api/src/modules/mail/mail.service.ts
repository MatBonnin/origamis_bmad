import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Mail transporter initialized with SMTP config');
    } else {
      this.logger.warn(
        'SMTP not configured - emails will be logged to console only',
      );
    }
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}`;
    const fromEmail = this.configService.get<string>('MAIL_FROM') || 'noreply@origami.local';

    const subject = 'Réinitialisation de votre mot de passe - Orig\'AMI';
    const html = this.getPasswordResetTemplate(userName, resetLink);
    const text = this.getPasswordResetTextTemplate(userName, resetLink);

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromEmail,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Password reset email sent to ${to}: ${info.messageId}`);
      } catch (error) {
        this.logger.error(`Failed to send password reset email to ${to}`, error);
        throw error;
      }
    } else {
      // Development mode - log to console
      this.logger.log('=== PASSWORD RESET EMAIL (DEV MODE) ===');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Reset Link: ${resetLink}`);
      this.logger.log('========================================');
    }
  }

  private getPasswordResetTemplate(userName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2c3e50; margin-bottom: 20px;">Réinitialisation de mot de passe</h1>

    <p>Bonjour ${userName},</p>

    <p>Vous avez demandé la réinitialisation de votre mot de passe sur Orig'AMI.</p>

    <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}"
         style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Réinitialiser mon mot de passe
      </a>
    </div>

    <p style="color: #7f8c8d; font-size: 14px;">
      Ce lien expire dans <strong>1 heure</strong>.
    </p>

    <p style="color: #7f8c8d; font-size: 14px;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #95a5a6; font-size: 12px;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
      <a href="${resetLink}" style="color: #3498db;">${resetLink}</a>
    </p>
  </div>

  <p style="color: #95a5a6; font-size: 12px; text-align: center; margin-top: 20px;">
    &copy; ${new Date().getFullYear()} Orig'AMI - Tous droits réservés
  </p>
</body>
</html>
    `.trim();
  }

  private getPasswordResetTextTemplate(userName: string, resetLink: string): string {
    return `
Bonjour ${userName},

Vous avez demandé la réinitialisation de votre mot de passe sur Orig'AMI.

Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
${resetLink}

Ce lien expire dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

---
Orig'AMI - ${new Date().getFullYear()}
    `.trim();
  }
}
