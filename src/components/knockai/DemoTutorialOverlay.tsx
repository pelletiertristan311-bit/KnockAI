'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

/* ─── Tour config ─────────────────────────────────────────── */

const STEP_MS = 5000;          // ms per step auto-advance
const TAB_SWITCH_DELAY = 320;  // ms to wait after tab navigation for DOM to update
const SESSION_KEY = 'knockai-demo-tour-dismissed';

type Tab = 'home' | 'team' | 'map' | 'settings';
type Phase = 'welcome' | 'touring' | 'done' | null;

interface TourStep {
  tab: Tab;
  selector: string;
  title: string;
  desc: string;
  padding?: number;
}

const STEPS: TourStep[] = [
  // ── HOME ──────────────────────────────────────────────────
  { tab: 'home',     selector: '[data-tour="clock-btn"]',           title: '▶ Clock In / Clock Out',     desc: "Appuie ici pour démarrer ton shift. Chaque seconde sur le terrain est comptée. Mets en pause si tu prends une pause.",              padding: 6 },
  { tab: 'home',     selector: '[data-tour="home-stats"]',          title: '📊 Tes stats du jour',        desc: "Portes frappées, ventes réalisées, heures travaillées et ton taux de conversion — tout en direct.",                              padding: 4 },
  { tab: 'home',     selector: '[data-tour="home-quick"]',          title: '⚡ Actions rapides',          desc: "Accède en 1 tap à la carte, pour ajouter un pin, voir tes stats ou ouvrir le chat d'équipe.",                                   padding: 4 },
  { tab: 'home',     selector: '[data-tour="home-goals"]',          title: '🎯 Objectifs quotidiens',     desc: "Fixe tes cibles de portes et de ventes. La barre de progression se remplit au fur et à mesure de ta journée.",                   padding: 4 },
  // ── TEAM ──────────────────────────────────────────────────
  { tab: 'team',     selector: '[data-tour="team-tab-members"]',    title: '👥 Membres de l\'équipe',    desc: "Vois qui est en ligne maintenant. Le point vert = actif sur le terrain en ce moment.",                                           padding: 6 },
  { tab: 'team',     selector: '[data-tour="team-tab-chat"]',       title: '💬 Chat d\'équipe',          desc: "Envoie des messages instantanés à toute ton équipe. Parfait pour les mises à jour terrain.",                                      padding: 6 },
  { tab: 'team',     selector: '[data-tour="team-tab-routes"]',     title: '🗺️ Routes de territoire',    desc: "Les gérants créent des zones sur la carte — tout le monde voit sa zone assignée en temps réel.",                                 padding: 6 },
  { tab: 'team',     selector: '[data-tour="team-tab-leaderboard"]',title: '🏆 Classement',              desc: "Qui mène aujourd'hui? Portes et ventes classées en temps réel. Un peu de compétition saine!",                                    padding: 6 },
  // ── MAP ───────────────────────────────────────────────────
  { tab: 'map',      selector: '[data-tour="map-filter"]',          title: '🏷️ Filtrer les pins',        desc: "Affiche seulement les Ventes 🟢, Rappels 🟡 ou Non-intéressés 🔴 pour cibler tes follow-ups.",                                  padding: 6 },
  { tab: 'map',      selector: '[data-tour="map-ai"]',              title: '🤖 Intelligence Artificielle',desc: "L'IA analyse ton historique et suggère la meilleure zone à prospecter aujourd'hui. Appuie pour voir la recommandation.",          padding: 8 },
  { tab: 'map',      selector: '[data-tour="map-area"]',            title: '📍 Poser un pin',            desc: "Appuie n'importe où sur la carte pour logger une porte. Choisis le résultat (Vente, Rappel, Non...) instantanément.",            padding: 0 },
  // ── SETTINGS ──────────────────────────────────────────────
  { tab: 'settings', selector: '[data-tour="settings-profile"]',    title: '👤 Ton profil',              desc: "Modifie ton nom et ta photo visibles par toute l'équipe. Tap le crayon ✏️ pour éditer.",                                          padding: 6 },
  { tab: 'settings', selector: '[data-tour="settings-notifs"]',     title: '🔔 Préférences & Notifs',    desc: "Active/désactive les alertes de ventes, messages, IA. Choisis aussi ta langue et l'unité de distance (km / miles).",             padding: 6 },
];

const PAGE_INFO: Record<Tab, { emoji: string; name: string; color: string }> = {
  home:     { emoji: '🏠', name: 'Accueil',  color: '#10B981' },
  team:     { emoji: '👥', name: 'Équipe',   color: '#8B5CF6' },
  map:      { emoji: '🗺️', name: 'Carte',    color: '#1A6FD6' },
  settings: { emoji: '⚙️', name: 'Réglages', color: '#F59E0B' },
};

/* ─── Spotlight rect helper ──────────────────────────────── */

interface SRect { top: number; left: number; width: number; height: number }

function getRect(selector: string, pad: number): SRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

/* ─── Main component ─────────────────────────────────────── */

export default function DemoTutorialOverlay() {
  const { user, activeTab, setActiveTab } = useKnockAIStore();
  const isDemo = user?.email === 'demo@knockai.com';

  const [phase, setPhase] = useState<Phase>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SRect | null>(null);
  const [progress, setProgress] = useState(0);
  const [pageTransition, setPageTransition] = useState<Tab | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  // Show welcome on first mount for demo users (once per session)
  useEffect(() => {
    if (!isDemo) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // small delay so screens finish rendering
    const t = setTimeout(() => setPhase('welcome'), 800);
    return () => clearTimeout(t);
  }, [isDemo]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setPhase(null);
    clearTimers();
  }, []);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  // ── Locate element and set spotlight ──────────────────────
  const locateStep = useCallback((idx: number) => {
    const step = STEPS[idx];
    if (!step) return;
    const rect = getRect(step.selector, step.padding ?? 6);
    setSpotlight(rect);
  }, []);

  // ── Start progress bar ────────────────────────────────────
  const startProgress = useCallback((onComplete: () => void) => {
    clearTimers();
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / STEP_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current!);
        onComplete();
      }
    }, 50);
  }, []);

  // ── Advance to next step ──────────────────────────────────
  const advance = useCallback((targetIdx?: number) => {
    const nextIdx = targetIdx !== undefined ? targetIdx : stepIndex + 1;
    clearTimers();
    setProgress(0);

    if (nextIdx >= STEPS.length) {
      setPhase('done');
      sessionStorage.setItem(SESSION_KEY, '1');
      return;
    }

    const nextStep = STEPS[nextIdx];
    const currentTab = useKnockAIStore.getState().activeTab;

    setStepIndex(nextIdx);

    if (nextStep.tab !== currentTab) {
      // Navigate to new tab then locate element
      setPageTransition(nextStep.tab);
      setActiveTab(nextStep.tab);
      setTimeout(() => {
        setPageTransition(null);
        locateStep(nextIdx);
        startProgress(() => advance(nextIdx + 1));
      }, TAB_SWITCH_DELAY + 200);
    } else {
      locateStep(nextIdx);
      startProgress(() => advance(nextIdx + 1));
    }
  }, [stepIndex, setActiveTab, locateStep, startProgress]);

  // ── Start tour ────────────────────────────────────────────
  const startTour = useCallback(() => {
    setPhase('touring');
    setStepIndex(0);
    const step = STEPS[0];

    // Make sure we're on the right tab
    const currentTab = useKnockAIStore.getState().activeTab;
    if (step.tab !== currentTab) {
      setActiveTab(step.tab);
      setTimeout(() => {
        locateStep(0);
        startProgress(() => advance(1));
      }, TAB_SWITCH_DELAY + 200);
    } else {
      setTimeout(() => {
        locateStep(0);
        startProgress(() => advance(1));
      }, 150);
    }
  }, [setActiveTab, locateStep, startProgress, advance]);

  // ── Manual next ───────────────────────────────────────────
  const handleNext = () => {
    advance(stepIndex + 1);
  };

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => () => clearTimers(), []);

  if (!isDemo || phase === null) return null;

  const currentStep = STEPS[stepIndex];

  return (
    <>
      <style>{`
        @keyframes kt-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kt-pulse-ring {
          0%   { box-shadow: 0 0 0 0px rgba(99,179,237,0.6), 0 0 0 9999px rgba(0,0,0,0.78); }
          50%  { box-shadow: 0 0 0 10px rgba(99,179,237,0.1), 0 0 0 9999px rgba(0,0,0,0.78); }
          100% { box-shadow: 0 0 0 0px rgba(99,179,237,0.0), 0 0 0 9999px rgba(0,0,0,0.78); }
        }
        @keyframes kt-bounce-down {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(7px); }
        }
        @keyframes kt-bounce-up {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-7px); }
        }
        @keyframes kt-page-flash {
          0%   { opacity: 0; transform: scale(0.88); }
          30%  { opacity: 1; transform: scale(1.04); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>

      {/* ── WELCOME MODAL ──────────────────────────────────── */}
      {phase === 'welcome' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(8,12,26,0.92)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px',
          animation: 'kt-fade-up 0.4s ease both',
        }}>
          <div style={{
            width: '100%', maxWidth: 380,
            background: 'linear-gradient(160deg, #111827 0%, #0D2B55 100%)',
            border: '1px solid rgba(26,111,214,0.35)',
            borderRadius: 28, padding: '36px 28px 28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          }}>
            {/* Badge */}
            <div style={{ marginBottom: 20, padding: '5px 14px', borderRadius: 30, background: 'rgba(26,111,214,0.18)', border: '1px solid rgba(26,111,214,0.4)', fontSize: 11, fontWeight: 800, color: '#63B3ED', letterSpacing: 1.3, textTransform: 'uppercase' }}>
              Compte Démo
            </div>

            {/* Logo */}
            <div style={{ fontSize: 52, marginBottom: 16 }}>🚪</div>

            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 }}>
              Bienvenue dans <span style={{ color: '#3B82F6' }}>KnockAI</span>!
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 1.65, margin: '0 0 28px' }}>
              La plateforme tout-en-un pour les équipes de démarchage porte-à-porte.{' '}
              <strong style={{ color: '#D1D5DB' }}>Suis tes portes, gère ton équipe et laisse l'IA optimiser ton territoire.</strong>
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
              {['📍 Pins en temps réel', '👥 Équipe synchronisée', '🗺️ Carte interactive', '🤖 IA intégrée'].map((f) => (
                <div key={f} style={{ padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#D1D5DB', fontWeight: 600 }}>{f}</div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={startTour}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #1A6FD6, #3B82F6)',
                color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
                marginBottom: 12,
              }}
            >
              Découvrir l&apos;app &rarr;
            </button>
            <button
              onClick={dismiss}
              style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
            >
              Passer le tutoriel
            </button>
          </div>
        </div>
      )}

      {/* ── PAGE TRANSITION FLASH ──────────────────────────── */}
      {phase === 'touring' && pageTransition && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'kt-page-flash 0.55s ease both',
        }}>
          <div style={{
            padding: '20px 36px', borderRadius: 24,
            background: 'rgba(13,20,40,0.95)',
            border: `2px solid ${PAGE_INFO[pageTransition].color}55`,
            boxShadow: `0 0 60px ${PAGE_INFO[pageTransition].color}33`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 44 }}>{PAGE_INFO[pageTransition].emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{PAGE_INFO[pageTransition].name}</div>
            <div style={{ fontSize: 12, color: PAGE_INFO[pageTransition].color, fontWeight: 700, letterSpacing: 1 }}>ON EXPLORE...</div>
          </div>
        </div>
      )}

      {/* ── TOUR SPOTLIGHT + TOOLTIP ───────────────────────── */}
      {phase === 'touring' && !pageTransition && spotlight && currentStep && (() => {
        const pad = 12;
        const cY = spotlight.top + spotlight.height / 2;
        const isTop = cY < window.innerHeight * 0.5;
        const tooltipTop = isTop
          ? spotlight.top + spotlight.height + 16
          : spotlight.top - 16 - 140; // ~140px for tooltip height estimate

        const cX = spotlight.left + spotlight.width / 2;
        const tooltipWidth = 300;
        const tooltipLeft = Math.max(12, Math.min(cX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12));

        // Page index for dots
        const tabs: Tab[] = ['home', 'team', 'map', 'settings'];
        const currentPageIdx = tabs.indexOf(currentStep.tab);
        const stepsOnCurrentPage = STEPS.filter((s) => s.tab === currentStep.tab);
        const stepOnPageIdx = stepsOnCurrentPage.indexOf(currentStep);

        return (
          <>
            {/* Spotlight */}
            <div
              key={`spot-${stepIndex}`}
              style={{
                position: 'fixed',
                top: spotlight.top, left: spotlight.left,
                width: spotlight.width, height: spotlight.height,
                borderRadius: 12,
                border: '2.5px solid rgba(99,179,237,0.85)',
                background: 'transparent',
                pointerEvents: 'none',
                zIndex: 99990,
                animation: 'kt-pulse-ring 2.2s ease-in-out infinite',
                transition: 'top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1), width 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}
            />

            {/* Bouncing arrow */}
            <div style={{
              position: 'fixed',
              left: cX - 16,
              top: isTop ? spotlight.top + spotlight.height + 4 : spotlight.top - 32,
              fontSize: 22, zIndex: 99992, pointerEvents: 'none',
              animation: isTop ? 'kt-bounce-down 0.85s ease-in-out infinite' : 'kt-bounce-up 0.85s ease-in-out infinite',
            }}>
              {isTop ? '👇' : '👆'}
            </div>

            {/* Tooltip card */}
            <div
              key={`tip-${stepIndex}`}
              style={{
                position: 'fixed',
                top: Math.max(pad, tooltipTop),
                left: tooltipLeft,
                width: tooltipWidth,
                zIndex: 99995,
                animation: 'kt-fade-up 0.3s ease both',
              }}
            >
              <div style={{
                background: 'linear-gradient(160deg, #1a2744 0%, #0d1f3c 100%)',
                border: '1px solid rgba(99,179,237,0.3)',
                borderRadius: 18, padding: '16px 18px 14px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
              }}>
                {/* Page tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{
                    padding: '2px 8px', borderRadius: 20,
                    background: `${PAGE_INFO[currentStep.tab].color}22`,
                    border: `1px solid ${PAGE_INFO[currentStep.tab].color}44`,
                    fontSize: 10, fontWeight: 800, color: PAGE_INFO[currentStep.tab].color,
                    letterSpacing: 0.8, textTransform: 'uppercase',
                  }}>
                    {PAGE_INFO[currentStep.tab].emoji} {PAGE_INFO[currentStep.tab].name}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 10, color: '#4B5563', fontWeight: 600 }}>
                    {stepOnPageIdx + 1}/{stepsOnCurrentPage.length}
                  </div>
                </div>

                <div style={{ fontSize: 15, fontWeight: 800, color: '#F1F5F9', marginBottom: 6, lineHeight: 1.3 }}>
                  {currentStep.title}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.55 }}>
                  {currentStep.desc}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: PAGE_INFO[currentStep.tab].color,
                    width: `${progress}%`,
                    transition: 'width 0.05s linear',
                  }} />
                </div>
              </div>
            </div>

            {/* Bottom control bar */}
            <div style={{
              position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
              zIndex: 99996, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {/* Page dots */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {tabs.map((tab, i) => (
                  <div key={tab} style={{
                    width: i === currentPageIdx ? 18 : 6,
                    height: 6, borderRadius: 3,
                    background: i === currentPageIdx ? PAGE_INFO[tab].color : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.3s ease',
                  }} />
                ))}
              </div>

              <button
                onClick={handleNext}
                style={{
                  padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Suivant →
              </button>

              <button
                onClick={dismiss}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                  color: '#4B5563', fontSize: 12, cursor: 'pointer',
                }}
              >
                Passer
              </button>
            </div>
          </>
        );
      })()}

      {/* ── DONE CELEBRATION ───────────────────────────────── */}
      {phase === 'done' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(8,12,26,0.9)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px',
          animation: 'kt-fade-up 0.4s ease both',
        }}>
          <div style={{
            width: '100%', maxWidth: 360,
            background: 'linear-gradient(160deg, #111827 0%, #064E3B 100%)',
            border: '1px solid rgba(16,185,129,0.35)',
            borderRadius: 28, padding: '36px 28px 28px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textAlign: 'center', margin: '0 0 10px' }}>
              Tu connais maintenant toute l&apos;app!
            </h2>
            <p style={{ color: '#6EE7B7', fontSize: 14, textAlign: 'center', lineHeight: 1.65, margin: '0 0 28px' }}>
              Clock in, frappe des portes, gère ton équipe et laisse l&apos;IA t&apos;aider à optimiser ton territoire. 🚀
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button
                onClick={() => { setPhase(null); setActiveTab('home'); }}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                }}
              >
                Commencer à prospecter 🚪
              </button>
              <button
                onClick={dismiss}
                style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: 13, cursor: 'pointer', padding: '8px 0' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
