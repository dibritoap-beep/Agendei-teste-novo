/**
 * Utilitários para Web Push Notifications e Alarmes em Segundo Plano no AGENDEI
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

export async function registerPushNotifications(): Promise<{ success: boolean; message?: string }> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'Navegador não suporta Web Push' };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permissão de notificação não concedida' };
    }

    const registration = await navigator.serviceWorker.ready;

    // Obtém a chave pública VAPID do servidor
    const keyRes = await fetch('/api/push-vapid-public-key');
    if (!keyRes.ok) {
      throw new Error('Falha ao obter chave VAPID');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      throw new Error('Chave VAPID pública indisponível');
    }

    // Verifica assinatura existente ou cria nova
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // Registra a assinatura no backend
    const subRes = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    if (!subRes.ok) {
      throw new Error('Falha ao salvar assinatura push no servidor');
    }

    localStorage.setItem('agendei_push_subscribed', 'true');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao registrar push notifications:', error);
    return { success: false, message: error.message || 'Erro ao registrar notificações' };
  }
}

export async function scheduleServerPushReminder(params: {
  id: string;
  targetTimestamp: number;
  title: string;
  body: string;
  callAlert?: boolean;
  appointmentId?: string;
}): Promise<boolean> {
  try {
    // 1. Tenta agendar localmente no Service Worker via Notification Trigger
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.active?.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: params.title,
          body: params.body,
          tag: params.id,
          callAlert: params.callAlert,
          timestamp: params.targetTimestamp
        });
      }).catch(() => {});
    }

    // 2. Registra no servidor para envio Push remoto garantido mesmo com celular fechado
    const res = await fetch('/api/push-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.ok;
  } catch (e) {
    console.warn('Erro ao agendar push no servidor:', e);
    return false;
  }
}

export async function sendTestPushNotification(delaySeconds = 5, callAlert = false): Promise<{ success: boolean; message: string }> {
  try {
    // Garante que está registrado primeiro
    await registerPushNotifications();

    const res = await fetch('/api/push-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delaySeconds, callAlert })
    });

    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || (callAlert ? 'Teste de chamada enviado!' : 'Notificação de teste enviada!')
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao enviar teste'
    };
  }
}
