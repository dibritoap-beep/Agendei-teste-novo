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

    const DEFAULT_VAPID_PUBLIC = 'BIUatPKLDp5ebV9MQvxz1Ik4imaKcU6me0cRGO1EuzKGHtLa2ZZ-4PuKwCaKUAtosZTow8H7SMPWDhofsFDLJwE';
    let publicKey = DEFAULT_VAPID_PUBLIC;

    // Tenta obter do servidor com fallback garantido
    try {
      const keyRes = await fetch('/api/push-vapid-public-key');
      if (keyRes.ok) {
        const data = await keyRes.json();
        if (data && data.publicKey) {
          publicKey = data.publicKey;
        }
      }
    } catch (e) {
      console.warn('Usando chave VAPID embutida padrão:', e);
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

    // Registra a assinatura no backend (com tolerância para serverless)
    try {
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    } catch (errSub) {
      console.warn('Registro no backend postergado:', errSub);
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
    // Registra no servidor para envio Push remoto garantido no momento exato do alarme
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
