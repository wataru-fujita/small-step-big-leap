'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CertificateData {
  playerName: string;
  timestamp: string;
  promises: string[];
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiItems, setConfettiItems] = useState<{ id: number; left: number; delay: number; color: string; size: number }[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 証明書（adventureCertificate）が未発行の場合は /intro へ自動リダイレクト
    const savedCert = localStorage.getItem('adventureCertificate');
    if (!savedCert) {
      router.push('/intro');
      return;
    }

    try {
      setCertificate(JSON.parse(savedCert));
    } catch (e) {
      console.error('Failed to load certificate', e);
    }
  }, [router]);

  const triggerCelebration = () => {
    // 記念紙吹雪＆お祝い演出の紙吹雪生成
    const colors = ['#D4AF37', '#B76E79', '#F3E5AB', '#E2C0E8', '#FFFFFF', '#FFB6C1'];
    const items = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12
    }));
    setConfettiItems(items);
    setShowCelebration(true);

    setTimeout(() => {
      setShowCelebration(false);
    }, 4500);
  };

  const handleReplayIntro = () => {
    // 再度イントロを行うため、現在の証明書をリセットして /intro へ移動
    localStorage.removeItem('adventureCertificate');
    router.push('/intro');
  };

  const handleClose = () => {
    // キオスクモードなどの全画面表示から抜け出すための終了ボタン
    // 全画面のままだと終了案内モーダルが見づらいので、先に解除しておく
    // (イントロのiframe側で入った全画面状態は、親ウィンドウ側から解除する)
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    // FullyKiosk(Android向けキオスクブラウザアプリ)が入っていればそちらのAPIで終了
    const fullyKiosk = (window as unknown as { FullyKiosk?: { closeApp?: () => void } }).FullyKiosk;
    if (fullyKiosk && typeof fullyKiosk.closeApp === 'function') {
      fullyKiosk.closeApp();
      return;
    }

    window.close();
    // window.close()は「ホーム画面に追加」等スクリプトで開いていないタブでは
    // 多くのモバイルブラウザで黙って無視される。反応が無い場合の案内を表示する。
    setTimeout(() => setShowExitModal(true), 100);
  };

  if (!mounted) return null; // ハイドレーションエラー防止

  return (
    <div className="relative min-h-screen bg-[#0d0714] overflow-x-hidden font-sans text-white pb-12 selection:bg-rose-500 selection:text-white">
      {/* Dynamic Celebration Confetti Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {confettiItems.map((item) => (
            <div
              key={item.id}
              className="absolute animate-bounce"
              style={{
                left: `${item.left}%`,
                top: `-20px`,
                width: `${item.size}px`,
                height: `${item.size * 1.4}px`,
                backgroundColor: item.color,
                borderRadius: '3px',
                transform: `rotate(${item.id * 18}deg)`,
                animation: `fall 3.5s linear ${item.delay}s infinite`,
                boxShadow: `0 0 10px ${item.color}`
              }}
            />
          ))}
          <style jsx>{`
            @keyframes fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-pulse">
            <div className="bg-gradient-to-r from-purple-900/90 via-rose-900/90 to-amber-950/90 border-2 border-amber-300/80 rounded-3xl p-6 text-center shadow-2xl transform scale-105">
              <div className="text-5xl mb-2">👑💖✨</div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 bg-clip-text text-transparent">
                初めての同意イベント記念日！
              </h3>
              <p className="text-amber-100/90 text-sm mt-1">大切な約束を守って、素敵なタブレットライフを楽しもう✨</p>
            </div>
          </div>
        </div>
      )}

      {/* Background Lighting & Elegance Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[140px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[160px] mix-blend-screen" />
        {/* 背景画像はTailwindの任意値クラスではなくstyle属性で指定している。
            任意値クラスで書くと、ビルド時にCSS内のパスをモジュールとして
            解決しようとして失敗するため。 */}
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "url('/vendor/textures/stardust.png')" }}
        />
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center justify-start min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        
        {/* Elegant Header Title */}
        <header className="text-center mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-rose-950/60 border border-rose-400/30 text-rose-200 text-xs font-semibold tracking-widest uppercase mb-3 shadow-inner">
            ✨ MY TABLET OWNER PASS ✨
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-rose-200 via-amber-200 to-purple-200 bg-clip-text text-transparent drop-shadow-md">
            TABLET DIGITAL PASSPORT
          </h1>
          <p className="text-rose-200/70 mt-2 text-xs md:text-sm font-medium tracking-wide">
            大人っぽくスマートに使いこなす、わたしだけのタブレット誓約カード
          </p>
        </header>

        {/* 👑 タブレット 契約＆誓約証明書 Card */}
        {certificate && (
          <section className="relative w-full backdrop-blur-2xl bg-gradient-to-b from-purple-950/40 via-slate-900/80 to-rose-950/50 border-2 border-amber-300/60 p-6 md:p-10 rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.2)] overflow-hidden transition-all hover:border-amber-300/90">
            
            {/* Elegant Sparkle decorative corners */}
            <div className="absolute top-4 left-5 text-amber-300/70 text-xl font-serif">✧</div>
            <div className="absolute top-4 right-5 text-amber-300/70 text-xl font-serif">✧</div>
            <div className="absolute bottom-4 left-5 text-amber-300/70 text-xl font-serif">✧</div>
            <div className="absolute bottom-4 right-5 text-amber-300/70 text-xl font-serif">✧</div>

            {/* Glowing Rose Gold Ambient */}
            <div className="absolute -right-16 -bottom-16 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              
              {/* Badge & Official Emblem */}
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-300/50 text-amber-200 text-xs md:text-sm font-bold mb-4 shadow-lg">
                <span>👑 ファミリー公認・正規タブレットオーナー証</span>
              </div>

              <h2 className="text-2xl md:text-4xl font-extrabold tracking-widest text-transparent bg-gradient-to-r from-amber-100 via-rose-200 to-amber-200 bg-clip-text drop-shadow-[0_2px_12px_rgba(212,175,55,0.4)] mb-1">
                ✨ TABLET DIGITAL PASS ✨
              </h2>

              <p className="text-xs text-amber-200/70 mb-6 tracking-widest font-mono uppercase">
                OFFICIAL AGREEMENT & CERTIFICATE
              </p>

              {/* Player Name Banner */}
              <div className="w-full max-w-md bg-gradient-to-r from-rose-950/80 via-purple-950/90 to-rose-950/80 border border-amber-300/40 py-4 px-6 rounded-2xl mb-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="text-xs text-rose-300/80 block font-semibold tracking-wider mb-0.5">誓約オーナー (DIGITAL OWNER)</span>
                <span className="text-2xl md:text-3xl font-black text-white tracking-wider drop-shadow-md">
                  {certificate.playerName} <span className="text-lg md:text-xl font-bold text-amber-300">様</span>
                </span>
              </div>

              {/* Promises List */}
              <div className="w-full max-w-lg bg-black/50 border border-amber-300/20 rounded-2xl p-5 md:p-6 mb-6 text-left space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-amber-300/20 pb-2 mb-3">
                  <p className="text-xs font-bold text-amber-200 tracking-wider">
                    💖 【 私が約束した 3つの大切なこと 】
                  </p>
                  <span className="text-[10px] text-rose-300/80 bg-rose-900/40 px-2 py-0.5 rounded border border-rose-400/30">AGREED</span>
                </div>
                {certificate.promises.map((promise, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 text-sm md:text-base text-gray-100 font-medium leading-relaxed">
                    <span className="text-amber-300 text-base mt-0.5">✦</span>
                    <span>{promise}</span>
                  </div>
                ))}
              </div>

              {/* Timestamp & Stamp Seal */}
              <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-lg pt-4 border-t border-amber-300/30 gap-4 text-xs md:text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-medium">✨ 同意記念日時:</span>
                  <span className="font-mono text-amber-100/90">{certificate.timestamp}</span>
                </div>

                {/* Gold Seal Emblem */}
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400/20 to-rose-400/20 rounded-xl border border-amber-300/60 text-amber-200 font-bold text-xs shadow-md">
                  <span>💖 AGREED & SIGNED (承認済印)</span>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg pt-2">
          {/* Memory Celebration Trigger Button */}
          <button 
            onClick={triggerCelebration}
            className="group relative flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 transition-all duration-300 shadow-lg shadow-rose-500/25 overflow-hidden font-bold text-base md:text-lg text-white"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">🎉</span>
              初めての同意イベントをお祝い！
            </span>
            <div className="absolute inset-0 h-full w-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </button>

          {/* Replay Intro Button */}
          <button 
            onClick={handleReplayIntro}
            className="group relative flex-1 px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 font-medium text-sm md:text-base text-gray-200"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>🔄</span>
              もう一度オープニングを見る
            </span>
          </button>
        </div>

        {/* Exit Button */}
        <button 
          onClick={handleClose}
          className="text-xs text-rose-300/60 hover:text-rose-200 underline pt-2 transition-colors"
        >
          アプリを終了する
        </button>

      </main>

      {/* Exit Guidance Modal — window.close()が効かないブラウザ向けの案内 */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">👋✨</div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">終了します</h3>
            <p className="text-sm text-purple-200/90 mb-6 leading-relaxed">
              画面の右上にある <span className="inline-block px-2 py-0.5 bg-red-500/30 border border-red-400 text-red-300 rounded font-bold">✕</span> ボタンまたはタブを閉じて終了してね！
            </p>
            <button
              onClick={() => setShowExitModal(false)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-sm text-gray-200"
            >
              画面に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

