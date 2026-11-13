import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      setShowIosHelp(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    if (isIosDevice()) setVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') setVisible(false);
      setInstallEvent(null);
      return;
    }
    if (isIosDevice()) setShowIosHelp(true);
  };

  return (
    <>
      <aside className="pwa-install-banner" role="region" aria-label="Installer ELOQIA">
        <img src="/icons/pwa-192x192.png" alt="" />
        <div className="pwa-install-copy">
          <strong>Installer ELOQIA</strong>
          <span>Retrouve ton coach directement sur ton écran d'accueil.</span>
        </div>
        <button type="button" className="pwa-install-action" onClick={install}>
          <Download size={15} /> Installer
        </button>
        <button type="button" className="pwa-dismiss" aria-label="Fermer" onClick={() => setVisible(false)}>
          <X size={16} />
        </button>
      </aside>

      {showIosHelp && (
        <div className="pwa-modal-backdrop" role="presentation" onClick={() => setShowIosHelp(false)}>
          <section className="pwa-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title" onClick={event => event.stopPropagation()}>
            <button className="pwa-modal-close" type="button" onClick={() => setShowIosHelp(false)} aria-label="Fermer"><X size={18} /></button>
            <div className="pwa-modal-icon"><Share size={22} /></div>
            <h2 id="pwa-ios-title">Ajouter ELOQIA à l'écran d'accueil</h2>
            <ol>
              <li>Ouvre cette page dans Safari.</li>
              <li>Appuie sur le bouton <strong>Partager</strong>.</li>
              <li>Choisis <strong>Sur l'écran d'accueil</strong>.</li>
              <li>Active <strong>Ouvrir comme app web</strong> si cette option apparaît, puis appuie sur Ajouter.</li>
            </ol>
            <button className="pwa-install-action pwa-modal-done" type="button" onClick={() => setShowIosHelp(false)}>J'ai compris</button>
          </section>
        </div>
      )}
    </>
  );
}
