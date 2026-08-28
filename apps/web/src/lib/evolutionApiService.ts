import { prismaAI } from '@/lib/prisma-ai';
import { generateInstantQR, sendDirectWhatsAppMessage } from '@/lib/baileysSession';

/**
 * Evolution API Client (v2)
 * Based on https://github.com/evolution-foundation/evolution-api
 * 
 * The official Evolution API integration for WhatsApp Web / Baileys instances.
 */

const DEFAULT_EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api.tolee.in';
const DEFAULT_EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'tolee_evolution_secret_key';

export interface EvolutionConnectionState {
  state: 'open' | 'connecting' | 'close' | 'DISCONNECTED';
  instanceName: string;
  phoneNumber?: string | null;
  qrCodeBase64?: string | null;
  pairingCode?: string | null;
}

export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(customUrl?: string, customKey?: string) {
    this.baseUrl = (customUrl || DEFAULT_EVOLUTION_URL).replace(/\/+$/, '');
    this.apiKey = customKey || DEFAULT_EVOLUTION_KEY;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    };
  }

  /**
   * 1. Create or Find Instance in Evolution API
   */
  async createInstance(instanceName: string): Promise<{ success: boolean; instance?: any; error?: string }> {
    try {
      const url = `${this.baseUrl}/instance/create`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          instanceName,
          token: `tolee_token_${instanceName}`,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          reject_call: false,
          msg_call: 'Calls are not supported.',
          groupsIgnore: false,
          alwaysOnline: true,
          readMessages: false,
          readStatus: false,
        }),
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 403 || data?.instance?.instanceName) {
        return { success: true, instance: data.instance || { instanceName } };
      }

      return { success: false, error: data.response?.message || 'Instance creation error' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 2. Connect / Fetch Live Real QR Code from Evolution API
   */
  async connectInstance(instanceName: string): Promise<{
    success: boolean;
    qrCodeDataUrl?: string;
    code?: string;
    pairingCode?: string;
    error?: string;
  }> {
    try {
      // First ensure instance exists
      await this.createInstance(instanceName);

      const url = `${this.baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.base64 || data.code)) {
        const qrUrl = data.base64?.startsWith('data:image')
          ? data.base64
          : data.base64
          ? `data:image/png;base64,${data.base64}`
          : null;
        return {
          success: true,
          qrCodeDataUrl: qrUrl || (await generateInstantQR(data.code)),
          code: data.code,
          pairingCode: data.pairingCode,
        };
      }

      return {
        success: false,
        error: 'Evolution API server is not responding. Please check server URL or link via Phone Number / Instant Link button below.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'Evolution API server unreachable. Please verify EVOLUTION_API_URL or use instant connect.',
      };
    }
  }

  /**
   * 3. Get Real Connection State (open, connecting, close)
   */
  async getConnectionState(instanceName: string): Promise<EvolutionConnectionState> {
    try {
      const url = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const state = data?.instance?.state || 'close';
        return {
          instanceName,
          state: state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : 'close',
          phoneNumber: data?.instance?.ownerJid ? `+${data.instance.ownerJid.split('@')[0]}` : null,
        };
      }
    } catch {}

    return {
      instanceName,
      state: 'close',
      phoneNumber: null,
    };
  }

  /**
   * 4. Send Real Text Message over Evolution API
   */
  async sendTextMessage(
    instanceName: string,
    phoneNumber: string,
    messageText: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

    try {
      const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          number: cleanNumber,
          text: messageText,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: true,
          },
        }),
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.key?.id) {
        return { success: true, messageId: data.key.id };
      }

      return { success: false, error: data?.response?.message || 'Evolution API send error' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. Send Media Message (Image, Video, Document)
   */
  async sendMediaMessage(
    instanceName: string,
    phoneNumber: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document',
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

    try {
      const url = `${this.baseUrl}/message/sendMedia/${encodeURIComponent(instanceName)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const mimetype = mediaType === 'image' ? 'image/jpeg' : mediaType === 'video' ? 'video/mp4' : 'application/pdf';
      const fileName = mediaType === 'document' ? 'document.pdf' : mediaType === 'video' ? 'video.mp4' : 'image.jpg';

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          number: cleanNumber,
          mediatype: mediaType,
          mimetype,
          caption: caption || '',
          media: mediaUrl,
          fileName,
        }),
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.key?.id) {
        return { success: true, messageId: data.key.id };
      }

      return { success: false, error: data?.response?.message || 'Evolution API media send error' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 6. Logout & Delete Instance
   */
  async logoutInstance(instanceName: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/instance/logout/${encodeURIComponent(instanceName)}`;
      await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }).catch(() => {});

      const deleteUrl = `${this.baseUrl}/instance/delete/${encodeURIComponent(instanceName)}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }).catch(() => {});

      return true;
    } catch {
      return true;
    }
  }
}

/**
 * Singleton Evolution API Dispatcher
 */
export const EvolutionEngine = new EvolutionApiService();
