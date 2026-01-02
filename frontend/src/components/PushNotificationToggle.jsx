import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from './ui/button';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';

export default function PushNotificationToggle({ token, language = 'it' }) {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe
  } = usePushNotifications(token);

  const texts = {
    it: {
      enable: 'Attiva Notifiche',
      disable: 'Disattiva Notifiche',
      enabled: 'Notifiche Attive',
      notSupported: 'Notifiche non supportate',
      denied: 'Notifiche bloccate',
      successEnable: 'Notifiche push attivate!',
      successDisable: 'Notifiche push disattivate',
      error: 'Errore nella configurazione'
    },
    en: {
      enable: 'Enable Notifications',
      disable: 'Disable Notifications',
      enabled: 'Notifications Active',
      notSupported: 'Notifications not supported',
      denied: 'Notifications blocked',
      successEnable: 'Push notifications enabled!',
      successDisable: 'Push notifications disabled',
      error: 'Configuration error'
    }
  };

  const t = texts[language] || texts.it;

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t.successDisable);
      } else {
        toast.error(t.error);
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t.successEnable);
      } else if (permission === 'denied') {
        toast.error(t.denied);
      } else {
        toast.error(t.error);
      }
    }
  };

  if (!isSupported) {
    return (
      <Button variant="outline" disabled className="opacity-50">
        <BellOff className="w-4 h-4 mr-2" />
        {t.notSupported}
      </Button>
    );
  }

  if (permission === 'denied') {
    return (
      <Button variant="outline" disabled className="opacity-50 text-red-500">
        <BellOff className="w-4 h-4 mr-2" />
        {t.denied}
      </Button>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      onClick={handleToggle}
      disabled={loading}
      className={isSubscribed 
        ? "bg-green-600 hover:bg-green-700 text-white" 
        : "border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10"}
    >
      {loading ? (
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></span>
      ) : isSubscribed ? (
        <Check className="w-4 h-4 mr-2" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      {isSubscribed ? t.enabled : t.enable}
    </Button>
  );
}
