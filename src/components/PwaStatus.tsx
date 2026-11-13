import { useEffect, useState } from 'react';
import { Check, RefreshCw, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Keep diagnostics free of user content and authentication data.
      console.error('ELOQIA service worker registration failed:', error);
    },
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  if (needRefresh) {
    return (
      <div className="pwa-status" role="status">
        <RefreshCw size={17} />
        <span>Une nouvelle version de ELOQIA est disponible.</span>
        <button type="button" onClick={() => updateServiceWorker(true)}>Mettre à jour</button>
        <button type="button" className="pwa-status-close" aria-label="Plus tard" onClick={() => setNeedRefresh(false)}><X size={16} /></button>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="pwa-status" role="status">
        <WifiOff size={17} />
        <span>Hors connexion : l'interface peut s'ouvrir, mais le coach IA et la synchronisation nécessitent Internet.</span>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="pwa-status" role="status">
        <Check size={17} />
        <span>Les éléments essentiels de l'application sont prêts hors connexion.</span>
        <button type="button" className="pwa-status-close" aria-label="Fermer" onClick={() => setOfflineReady(false)}><X size={16} /></button>
      </div>
    );
  }

  return null;
}
