/* ============================================
   🌟 Welcome Experience — Main Application
   Babylon.js 3D Space Adventure
   初回起動体験(お子様の名前やお約束は public/config.js で設定します)
   ============================================ */

// ----- Utility helpers -----
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));

// ============================================
//  Procedural Texture Factory
// ============================================
class TextureFactory {
    /** Small bright star (used for most particles) */
    static createStar(scene) {
        const s = 64;
        const dt = new BABYLON.DynamicTexture("starTex", s, scene, false);
        const ctx = dt.getContext();
        const h = s / 2;
        const g = ctx.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.12, "rgba(255,255,255,0.85)");
        g.addColorStop(0.35, "rgba(255,240,210,0.35)");
        g.addColorStop(0.7, "rgba(255,200,120,0.08)");
        g.addColorStop(1, "rgba(255,150,80,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        dt.update();
        dt.hasAlpha = true;
        return dt;
    }

    /** Soft wide glow (nebula / atmosphere) */
    static createSoftGlow(scene) {
        const s = 128;
        const dt = new BABYLON.DynamicTexture("glowTex", s, scene, false);
        const ctx = dt.getContext();
        const h = s / 2;
        const g = ctx.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, "rgba(255,255,255,0.5)");
        g.addColorStop(0.25, "rgba(200,180,255,0.25)");
        g.addColorStop(0.55, "rgba(120,100,255,0.08)");
        g.addColorStop(1, "rgba(50,30,100,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        dt.update();
        dt.hasAlpha = true;
        return dt;
    }

    /** Cross-shaped flare sparkle */
    static createFlare(scene) {
        const s = 64;
        const dt = new BABYLON.DynamicTexture("flareTex", s, scene, false);
        const ctx = dt.getContext();
        const h = s / 2;
        ctx.globalCompositeOperation = "lighter";

        // Horizontal beam
        const hg = ctx.createLinearGradient(0, h, s, h);
        hg.addColorStop(0, "rgba(255,255,255,0)");
        hg.addColorStop(0.35, "rgba(255,255,255,0.4)");
        hg.addColorStop(0.5, "rgba(255,255,255,1)");
        hg.addColorStop(0.65, "rgba(255,255,255,0.4)");
        hg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(0, h - 3, s, 6);

        // Vertical beam
        const vg = ctx.createLinearGradient(h, 0, h, s);
        vg.addColorStop(0, "rgba(255,255,255,0)");
        vg.addColorStop(0.35, "rgba(255,255,255,0.4)");
        vg.addColorStop(0.5, "rgba(255,255,255,1)");
        vg.addColorStop(0.65, "rgba(255,255,255,0.4)");
        vg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = vg;
        ctx.fillRect(h - 3, 0, 6, s);

        // Centre glow
        const cg = ctx.createRadialGradient(h, h, 0, h, h, 10);
        cg.addColorStop(0, "rgba(255,255,255,1)");
        cg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(h, h, 10, 0, Math.PI * 2);
        ctx.fill();

        dt.update();
        dt.hasAlpha = true;
        return dt;
    }
}

// ============================================
//  Space Audio — Web Audio API Synthesiser
// ============================================
class SpaceAudio {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.reverb = null;
        this.drones = [];
        this.ready = false;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0;
            this.master.connect(this.ctx.destination);
            this._buildReverb();
            this.ready = true;
        } catch (e) {
            console.warn("Audio not available:", e);
        }
    }

    _buildReverb() {
        const len = this.ctx.sampleRate * 3;
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
            }
        }
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = buf;
        this.reverb.connect(this.master);
    }

    /* Ambient space drone */
    startDrone() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        const notes = [55, 55.3, 82.5, 110, 164.81];
        const gains = [0.12, 0.08, 0.06, 0.04, 0.025];

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = i < 2 ? "sine" : "triangle";
            osc.frequency.value = freq;

            const g = this.ctx.createGain();
            g.gain.value = gains[i];

            // Slow LFO for movement
            const lfo = this.ctx.createOscillator();
            lfo.type = "sine";
            lfo.frequency.value = 0.1 + Math.random() * 0.15;
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = freq * 0.008;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);

            osc.connect(g);
            g.connect(this.reverb);
            osc.start(now);
            this.drones.push({ osc, gain: g, lfo });
        });

        this.master.gain.setValueAtTime(0, now);
        this.master.gain.linearRampToValueAtTime(0.35, now + 4);
    }

    /* Big-bang boom */
    playBoom() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;

        // Sub bass sweep
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 2);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 2.5);

        // Noise burst
        const nBuf = this.ctx.createBuffer(
            1,
            this.ctx.sampleRate * 0.6,
            this.ctx.sampleRate
        );
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = nBuf;
        const nf = this.ctx.createBiquadFilter();
        nf.type = "lowpass";
        nf.frequency.setValueAtTime(800, now);
        nf.frequency.exponentialRampToValueAtTime(60, now + 0.8);
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.35, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(this.master);
        noise.start(now);
        noise.stop(now + 0.8);
    }

    /* Touch sparkle */
    playSparkle() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        const freq = 1200 + Math.random() * 2500;
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + 0.08);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(g);
        g.connect(this.reverb);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    /* Musical chime for message reveals */
    playChime(freq = 523.25) {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        [freq, freq * 1.5, freq * 2].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = f;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.1 / (i + 1), now + i * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            osc.connect(g);
            g.connect(this.reverb);
            osc.start(now + i * 0.06);
            osc.stop(now + 2.5);
        });
    }

    /* Ascending melody for the message scene */
    playMelody() {
        if (!this.ready) return;
        const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
            setTimeout(() => this.playChime(f), i * 600);
        });
    }

    /* Whoosh sweep for transitions */
    playSweep(up = true) {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        const nBuf = this.ctx.createBuffer(
            1,
            this.ctx.sampleRate * 1.5,
            this.ctx.sampleRate
        );
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = nBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 5;
        if (up) {
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(4000, now + 1);
        } else {
            filter.frequency.setValueAtTime(4000, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 1);
        }
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.reverb);
        noise.start(now);
        noise.stop(now + 1.5);
    }

    /* Firework burst */
    playFirework() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        // Multiple sparkle tones
        for (let i = 0; i < 8; i++) {
            const delay = i * 0.07;
            const freq = 600 + Math.random() * 3000;
            const osc = this.ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + delay);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + delay + 1);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.08, now + delay);
            g.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);
            osc.connect(g);
            g.connect(this.reverb);
            osc.start(now + delay);
            osc.stop(now + delay + 1.5);
        }
        // Low thud
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 1);
    }

    fadeIn(dur = 3) {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        this.master.gain.linearRampToValueAtTime(0.35, now + dur);
    }

    fadeOut(dur = 2) {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        this.master.gain.linearRampToValueAtTime(0, now + dur);
    }
}

// ============================================
//  Main Welcome Experience
// ============================================
class WelcomeExperience {
    // config.js が読み込めなかった場合の既定のお約束文言。
    // config.js 本体のデフォルト値と揃えてあり、ルビも共通化するため
    // ここを唯一の情報源にしている(以前は同じ文言が3箇所に別々に
    // ハードコードされており、演出中の表示だけ内容が食い違っていた)。
    static DEFAULT_PROMISES = [
        "✨ ① <ruby>勉強<rt>べんきょう</rt></ruby>や<ruby>調<rt>しら</rt></ruby>べもの、<ruby>自分<rt>じぶん</rt></ruby>の<ruby>成長<rt>せいちょう</rt></ruby>のためにタブレットを<ruby>活用<rt>かつよう</rt></ruby>します",
        "💎 ② つかう<ruby>時間<rt>じかん</rt></ruby>とマナーをしっかり<ruby>守<rt>まも</rt></ruby>り、<ruby>自分自身<rt>じぶんじしん</rt></ruby>を<ruby>大切<rt>たいせつ</rt></ruby>にします",
        "🌸 ③ <ruby>新<rt>あたら</rt></ruby>しい<ruby>発見<rt>はっけん</rt></ruby>や<ruby>素敵<rt>すてき</rt></ruby>な<ruby>体験<rt>たいけん</rt></ruby>を<ruby>楽<rt>たの</rt></ruby>しみ、<ruby>家族<rt>かぞく</rt></ruby>にもたくさんシェアします"
    ];

    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.pipeline = null;
        this.audio = new SpaceAudio();
        this.textures = {};
        this.particleSystems = [];
        this.meshes = [];
        this.totalTime = 0;
        this.phase = "loading";
        this.phaseTime = 0;
        this.touchEnabled = false;
        this.cameraTarget = { x: 0, y: 0, z: -10 };
        this.cameraLookAt = new BABYLON.Vector3(0, 0, 0);
        this.shaking = false;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeStart = 0;
        this.shakeBasePos = null;
    }

    async init() {
        // Initialise Babylon Engine
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: false,
            stencil: true,
            antialias: true,
            powerPreference: "high-performance",
        });

        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.02, 0.01, 0.06, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.0008;
        this.scene.fogColor = new BABYLON.Color3(0.02, 0.01, 0.06);

        // Camera
        this.camera = new BABYLON.FreeCamera(
            "cam",
            new BABYLON.Vector3(0, 0, -10),
            this.scene
        );
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.fov = 1.2;
        this.camera.minZ = 0.1;
        this.camera.maxZ = 500;
        // Disable user input on camera
        this.camera.inputs.clear();

        // Textures
        this.textures.star = TextureFactory.createStar(this.scene);
        this.textures.glow = TextureFactory.createSoftGlow(this.scene);
        this.textures.flare = TextureFactory.createFlare(this.scene);

        // Post-processing
        this._setupPostProcessing();

        // Touch interaction
        this._setupTouch();

        // Start render loop
        this.engine.runRenderLoop(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            this.totalTime += dt;
            this.phaseTime += dt;
            this._update(dt);
            this.scene.render();
        });

        // Handle resize
        window.addEventListener("resize", () => this.engine.resize());

        // Mark loading ready
        this._setLoadingReady();
    }

    // ----- Post-Processing Pipeline -----
    _setupPostProcessing() {
        this.pipeline = new BABYLON.DefaultRenderingPipeline(
            "pipeline",
            true,
            this.scene,
            [this.camera]
        );
        // Bloom
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomThreshold = 0.15;
        this.pipeline.bloomWeight = 0.6;
        this.pipeline.bloomKernel = 64;
        this.pipeline.bloomScale = 0.5;
        // Image processing
        this.pipeline.imageProcessingEnabled = true;
        this.pipeline.imageProcessing.contrast = 1.3;
        this.pipeline.imageProcessing.exposure = 1.1;
        this.pipeline.imageProcessing.toneMappingEnabled = true;
        this.pipeline.imageProcessing.toneMappingType =
            BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        this.pipeline.imageProcessing.vignetteEnabled = true;
        this.pipeline.imageProcessing.vignetteWeight = 3;
        this.pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0.05, 0);
        // FXAA
        this.pipeline.fxaaEnabled = true;
        // Chromatic Aberration (subtle)
        this.pipeline.chromaticAberrationEnabled = true;
        this.pipeline.chromaticAberration.aberrationAmount = 15;
        // Grain
        this.pipeline.grainEnabled = true;
        this.pipeline.grain.intensity = 8;
        this.pipeline.grain.animated = true;
    }

    // ----- Fullscreen -----
    // requestFullscreen() はユーザー操作(クリック/タップ)の呼び出し直後、
    // 同期的な処理の中でしか成功しない(非同期処理を挟むと拒否される)。
    // そのため beginExperience() の一番最初、他の処理より前に呼ぶ。
    //
    // 実機検証の結果、content://(ファイルアプリ経由で開いた場合)のような
    // 不透明オリジンではこのAPI自体が許可されないことが分かった。それでも
    // 対応環境(https配信など)では効く可能性があるため、ベストエフォートとして残す。
    // 対応していない・拒否された場合も演出はそのまま進む(実質的にアドレスバーは
    // 表示されたままになるが、それ以上の対策は演出画面のレイアウトを崩すリスクが
    // あったため見送っている)。
    _requestFullscreenSafe() {
        try {
            const el = document.documentElement;
            const request =
                el.requestFullscreen ||
                el.webkitRequestFullscreen ||
                el.mozRequestFullScreen ||
                el.msRequestFullscreen;
            if (!request) return;
            const result = request.call(el);
            if (result && typeof result.catch === "function") {
                result.catch(() => {
                    // 非対応・拒否されても演出はそのまま続ける
                });
            }
        } catch (e) {
            // 何が起きても演出を止めない
        }
    }

    // ----- Loading Screen -----
    //
    // 最初は必ず「タップして冒険を始めよう！」で待機する。
    // ブラウザの自動再生ポリシー上、音を鳴らすには一度ユーザーの操作が必要なため、
    // この1タップは仕組み上どうしても省けない。
    //
    // 「スリープ箱詰め」でスリープ復帰時にタブが再読み込みされた場合も、
    // ここでもう一度タップしてもらう形になる。
    _setLoadingReady() {
        const text = document.getElementById("loadingText");
        const star = document.getElementById("loadingStar");
        text.innerHTML = "タップして<ruby>冒険<rt>ぼうけん</rt></ruby>を<ruby>始<rt>はじ</rt></ruby>めよう！";
        text.classList.add("ready");
        star.style.color = "#ffd700";

        const loadingScreen = document.getElementById("loading-screen");
        let handled = false;

        const beginExperience = () => {
            if (handled) return;
            handled = true;

            loadingScreen.removeEventListener("pointerdown", handler);
            loadingScreen.removeEventListener("click", handler);

            // ユーザー操作直後の同期処理として、他の何よりも先に呼ぶ
            this._requestFullscreenSafe();

            this.audio.init();
            if (this.audio.ctx && this.audio.ctx.state === "suspended") {
                this.audio.ctx.resume();
            }
            loadingScreen.classList.add("fade-out");
            setTimeout(() => {
                loadingScreen.style.display = "none";
                this._promptPlayerSelect();
            }, 600);
        };

        const handler = (e) => {
            e?.stopPropagation();
            beginExperience();
        };

        loadingScreen.addEventListener("pointerdown", handler);
        loadingScreen.addEventListener("click", handler);
    }

    // ----- Prompt Player Selection -----
    _promptPlayerSelect() {
        const playerModal = document.getElementById("player-select-modal");
        const container = document.getElementById("player-select-buttons");

        if (!playerModal || !container) {
            this.selectedPlayer = "";
            this._startExperience();
            return;
        }

        // Render buttons dynamically from APP_CONFIG
        // フォールバックの内容は public/config.js の初期値と揃えている
        // (名前がコード内に散らばると、config.js を書き換えても別の名前が出てしまうため)
        const configPlayers = (window.APP_CONFIG && window.APP_CONFIG.players) || [
            { name: "かえで", hiragana: "かえで", avatar: "👑✨", grade: "小学ｎ年生" },
            { name: "さくら", hiragana: "さくら", avatar: "💎🌸", grade: "小学ｎ年生" }
        ];

        container.innerHTML = "";
        configPlayers.forEach((p) => {
            const btn = document.createElement("button");
            btn.className = "player-btn";
            btn.setAttribute("data-player", p.name);
            btn.innerHTML = `
                <span class="player-avatar">${p.avatar || '✨'}</span>
                <span class="player-name">${p.name}</span>
                <span class="player-sub">（${p.hiragana || ''}）</span>
            `;
            container.appendChild(btn);
        });

        playerModal.classList.remove("hidden");
        requestAnimationFrame(() => playerModal.classList.add("visible"));

        const buttons = container.querySelectorAll(".player-btn");
        let selected = false;

        const handleSelect = (e) => {
            e?.stopPropagation();
            if (selected) return;
            selected = true;

            const btn = e.currentTarget;
            this.selectedPlayer = btn.getAttribute("data-player") || "";
            this.audio.playChime(783.99);

            playerModal.classList.remove("visible");
            setTimeout(() => {
                playerModal.classList.add("hidden");
                this._startExperience();
            }, 400);

            buttons.forEach((b) => {
                b.removeEventListener("pointerdown", handleSelect);
                b.removeEventListener("click", handleSelect);
            });
        };

        buttons.forEach((b) => {
            b.addEventListener("pointerdown", handleSelect);
            b.addEventListener("click", handleSelect);
        });
    }

    // ----- Start the main sequence -----
    async _startExperience() {
        this.audio.startDrone();
        this.phase = "bigbang";
        this.phaseTime = 0;

        await this._scene1_BigBang();
        await this._scene2_StarWarp();
        await this._scene3_Planetary();
        await this._scene4_Message();
        await this._scene5_Start();
    }

    // ==========================================
    //  SCENE 1 — Big Bang  (0 – 4 s)
    // ==========================================
    async _scene1_BigBang() {
        this.phase = "bigbang";
        this.phaseTime = 0;

        // Central seed of light
        const seed = BABYLON.MeshBuilder.CreateSphere(
            "seed",
            { diameter: 0.15, segments: 16 },
            this.scene
        );
        const seedMat = new BABYLON.StandardMaterial("seedMat", this.scene);
        seedMat.emissiveColor = new BABYLON.Color3(1, 0.95, 0.8);
        seedMat.disableLighting = true;
        seed.material = seedMat;
        this.meshes.push(seed);

        // Point light at centre
        const light = new BABYLON.PointLight(
            "bangLight",
            BABYLON.Vector3.Zero(),
            this.scene
        );
        light.intensity = 0;
        light.diffuse = new BABYLON.Color3(1, 0.9, 0.7);

        // Wait for build-up
        await wait(800);

        // BOOM!
        this.audio.playBoom();
        light.intensity = 50;
        this.pipeline.bloomWeight = 2.5;
        this.pipeline.bloomThreshold = 0.01;
        this._startShake(0.6, 1.5);

        // Explosion particles
        const explosion = new BABYLON.ParticleSystem("bang", 4000, this.scene);
        explosion.particleTexture = this.textures.star;
        explosion.emitter = BABYLON.Vector3.Zero();
        explosion.createSphereEmitter(0.3);
        explosion.minLifeTime = 1.5;
        explosion.maxLifeTime = 3.5;
        explosion.minSize = 0.04;
        explosion.maxSize = 0.25;
        explosion.minEmitPower = 15;
        explosion.maxEmitPower = 60;
        explosion.emitRate = 0;
        explosion.manualEmitCount = 4000;
        explosion.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        explosion.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 1));
        explosion.addColorGradient(0.15, new BABYLON.Color4(1, 0.9, 0.5, 1));
        explosion.addColorGradient(0.4, new BABYLON.Color4(1, 0.5, 0.2, 0.8));
        explosion.addColorGradient(0.7, new BABYLON.Color4(0.4, 0.3, 1, 0.5));
        explosion.addColorGradient(1, new BABYLON.Color4(0.2, 0.1, 0.5, 0));
        explosion.addSizeGradient(0, 0.15);
        explosion.addSizeGradient(0.3, 0.25);
        explosion.addSizeGradient(1, 0.02);
        explosion.gravity = new BABYLON.Vector3(0, 0, 0);
        explosion.start();
        this.particleSystems.push(explosion);

        // Shockwave ring
        const ring = BABYLON.MeshBuilder.CreateTorus(
            "shockwave",
            { diameter: 0.5, thickness: 0.08, tessellation: 64 },
            this.scene
        );
        const ringMat = new BABYLON.StandardMaterial("ringMat", this.scene);
        ringMat.emissiveColor = new BABYLON.Color3(0.7, 0.6, 1);
        ringMat.alpha = 0.8;
        ringMat.disableLighting = true;
        ringMat.backFaceCulling = false;
        ring.material = ringMat;
        ring.scaling.y = 0.1;
        this.meshes.push(ring);

        // Animate shockwave expansion
        const shockAnim = () => {
            const t = this.phaseTime;
            if (t < 3 && ring && !ring.isDisposed()) {
                const scale = 1 + easeOutExpo(t / 3) * 80;
                ring.scaling.x = scale;
                ring.scaling.z = scale;
                ringMat.alpha = Math.max(0, 0.8 * (1 - t / 2.5));
                requestAnimationFrame(shockAnim);
            } else if (ring && !ring.isDisposed()) {
                ring.dispose();
            }
        };
        shockAnim();

        // Animate bloom recovery
        const bloomRecover = () => {
            const t = this.phaseTime;
            if (t < 3) {
                this.pipeline.bloomWeight = 2.5 - easeOutCubic(t / 3) * 1.8;
                this.pipeline.bloomThreshold = 0.01 + easeOutCubic(t / 3) * 0.14;
                light.intensity = 50 * (1 - easeOutCubic(t / 3));
                seed.scaling = new BABYLON.Vector3(
                    1 + t * 5,
                    1 + t * 5,
                    1 + t * 5
                );
                seedMat.alpha = Math.max(0, 1 - t / 1.5);
                requestAnimationFrame(bloomRecover);
            }
        };
        bloomRecover();

        await wait(4000);
        // Cleanup
        if (seed && !seed.isDisposed()) seed.dispose();
        light.dispose();
    }

    // ==========================================
    //  SCENE 2 — Star Journey (5 phases, ~22 s)
    //  Phase 1: Acceleration (0–3s)
    //  Phase 2: Full speed (3–8s)
    //  Phase 3: Nebula passage (8–14s)
    //  Phase 4: Star cluster (14–18s)
    //  Phase 5: Deceleration & arrival (18–22s)
    // ==========================================
    async _scene2_StarWarp() {
        this.phase = "starwarp";
        this.phaseTime = 0;
        this.audio.playSweep(true);

        // === Layer 1: Background deep stars (tiny, slow) ===
        const bgStars = new BABYLON.ParticleSystem("bgDeep", 700, this.scene);
        bgStars.particleTexture = this.textures.star;
        bgStars.emitter = new BABYLON.Vector3(0, 0, 70);
        bgStars.minEmitBox = new BABYLON.Vector3(-130, -90, -50);
        bgStars.maxEmitBox = new BABYLON.Vector3(130, 90, 50);
        bgStars.direction1 = new BABYLON.Vector3(0, 0, -1);
        bgStars.direction2 = new BABYLON.Vector3(0, 0, -1);
        bgStars.minEmitPower = 15;
        bgStars.maxEmitPower = 35;
        bgStars.minLifeTime = 3;
        bgStars.maxLifeTime = 6;
        bgStars.minSize = 0.01;
        bgStars.maxSize = 0.045;
        bgStars.emitRate = 200;
        bgStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        bgStars.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0));
        bgStars.addColorGradient(0.1, new BABYLON.Color4(0.9, 0.92, 1, 0.5));
        bgStars.addColorGradient(0.85, new BABYLON.Color4(0.85, 0.88, 1, 0.4));
        bgStars.addColorGradient(1, new BABYLON.Color4(1, 1, 1, 0));
        bgStars.gravity = BABYLON.Vector3.Zero();
        bgStars.start();
        this.particleSystems.push(bgStars);

        // === Layer 2: Warm-tone mid-speed stars ===
        const warmStars = new BABYLON.ParticleSystem("warmStars", 1000, this.scene);
        warmStars.particleTexture = this.textures.star;
        warmStars.emitter = new BABYLON.Vector3(0, 0, 95);
        warmStars.minEmitBox = new BABYLON.Vector3(-75, -50, -30);
        warmStars.maxEmitBox = new BABYLON.Vector3(75, 50, 30);
        warmStars.direction1 = new BABYLON.Vector3(-0.2, -0.2, -1);
        warmStars.direction2 = new BABYLON.Vector3(0.2, 0.2, -1);
        warmStars.minEmitPower = 50;
        warmStars.maxEmitPower = 110;
        warmStars.minLifeTime = 0.6;
        warmStars.maxLifeTime = 2.0;
        warmStars.minSize = 0.02;
        warmStars.maxSize = 0.09;
        warmStars.emitRate = 0;
        warmStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        warmStars.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
        if (warmStars.stretchFactor !== undefined) warmStars.stretchFactor = 18;
        warmStars.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0));
        warmStars.addColorGradient(0.1, new BABYLON.Color4(1, 0.92, 0.7, 0.9));
        warmStars.addColorGradient(0.6, new BABYLON.Color4(1, 0.7, 0.4, 0.7));
        warmStars.addColorGradient(1, new BABYLON.Color4(1, 0.5, 0.2, 0));
        warmStars.gravity = BABYLON.Vector3.Zero();
        warmStars.start();
        this.particleSystems.push(warmStars);

        // === Layer 3: Cool/blue fast streaks ===
        const coolStars = new BABYLON.ParticleSystem("coolStars", 1500, this.scene);
        coolStars.particleTexture = this.textures.star;
        coolStars.emitter = new BABYLON.Vector3(0, 0, 110);
        coolStars.minEmitBox = new BABYLON.Vector3(-90, -55, -35);
        coolStars.maxEmitBox = new BABYLON.Vector3(90, 55, 35);
        coolStars.direction1 = new BABYLON.Vector3(-0.3, -0.3, -1);
        coolStars.direction2 = new BABYLON.Vector3(0.3, 0.3, -1);
        coolStars.minEmitPower = 80;
        coolStars.maxEmitPower = 200;
        coolStars.minLifeTime = 0.3;
        coolStars.maxLifeTime = 1.0;
        coolStars.minSize = 0.02;
        coolStars.maxSize = 0.13;
        coolStars.emitRate = 0;
        coolStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        coolStars.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
        if (coolStars.stretchFactor !== undefined) coolStars.stretchFactor = 45;
        coolStars.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0));
        coolStars.addColorGradient(0.1, new BABYLON.Color4(0.8, 0.92, 1, 1));
        coolStars.addColorGradient(0.6, new BABYLON.Color4(0.5, 0.7, 1, 0.85));
        coolStars.addColorGradient(1, new BABYLON.Color4(0.3, 0.4, 1, 0));
        coolStars.gravity = BABYLON.Vector3.Zero();
        coolStars.start();
        this.particleSystems.push(coolStars);

        // === Layer 4: Occasional brilliant flare stars ===
        const flareStars = new BABYLON.ParticleSystem("flareStars", 40, this.scene);
        flareStars.particleTexture = this.textures.flare;
        flareStars.emitter = new BABYLON.Vector3(0, 0, 85);
        flareStars.minEmitBox = new BABYLON.Vector3(-65, -45, -25);
        flareStars.maxEmitBox = new BABYLON.Vector3(65, 45, 25);
        flareStars.direction1 = new BABYLON.Vector3(-0.1, -0.1, -1);
        flareStars.direction2 = new BABYLON.Vector3(0.1, 0.1, -1);
        flareStars.minEmitPower = 55;
        flareStars.maxEmitPower = 130;
        flareStars.minLifeTime = 0.5;
        flareStars.maxLifeTime = 1.6;
        flareStars.minSize = 0.25;
        flareStars.maxSize = 0.9;
        flareStars.emitRate = 3;
        flareStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        flareStars.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0));
        flareStars.addColorGradient(0.15, new BABYLON.Color4(1, 0.97, 0.82, 0.9));
        flareStars.addColorGradient(0.7, new BABYLON.Color4(1, 0.8, 0.5, 0.5));
        flareStars.addColorGradient(1, new BABYLON.Color4(1, 0.6, 0.3, 0));
        flareStars.gravity = BABYLON.Vector3.Zero();
        flareStars.start();
        this.particleSystems.push(flareStars);

        // === Coloured nebulae appearing at different moments ===
        const nebulaSpecs = [
            { c1: [0.4, 0.1, 0.6],  c2: [0.3, 0.05, 0.5], start: 3000,  dur: 4500 },
            { c1: [0.6, 0.15, 0.4], c2: [0.5, 0.1, 0.3],  start: 7000,  dur: 4000 },
            { c1: [0.1, 0.25, 0.65],c2: [0.05, 0.15, 0.5], start: 11000, dur: 4000 },
            { c1: [0.1, 0.5, 0.5],  c2: [0.05, 0.4, 0.4],  start: 15500, dur: 3500 },
        ];
        nebulaSpecs.forEach((ns) => {
            setTimeout(() => {
                if (this.phase !== "starwarp") return;
                const neb = new BABYLON.ParticleSystem("neb", 50, this.scene);
                neb.particleTexture = this.textures.glow;
                neb.emitter = new BABYLON.Vector3(0, 0, 75);
                neb.minEmitBox = new BABYLON.Vector3(-40, -28, -18);
                neb.maxEmitBox = new BABYLON.Vector3(40, 28, 18);
                neb.direction1 = new BABYLON.Vector3(0, 0, -1);
                neb.direction2 = new BABYLON.Vector3(0, 0, -1);
                neb.minEmitPower = 22;
                neb.maxEmitPower = 45;
                neb.minLifeTime = 2.5;
                neb.maxLifeTime = 5.5;
                neb.minSize = 6;
                neb.maxSize = 24;
                neb.emitRate = 10;
                neb.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
                neb.addColorGradient(0, new BABYLON.Color4(...ns.c1, 0));
                neb.addColorGradient(0.25, new BABYLON.Color4(...ns.c1, 0.08));
                neb.addColorGradient(0.6, new BABYLON.Color4(...ns.c2, 0.05));
                neb.addColorGradient(1, new BABYLON.Color4(...ns.c2, 0));
                neb.gravity = BABYLON.Vector3.Zero();
                neb.start();
                this.particleSystems.push(neb);
                setTimeout(() => { neb.emitRate = 0; }, ns.dur);
            }, ns.start);
        });

        // === 3D Flyby star objects ===
        this._flybyStars = [];
        this._flybySpawnTimer = 0;

        // === Per-frame warp update — 5 phases + flyby stars ===
        const warpStartZ = this.cameraTarget.z;
        this._warpUpdate = (dt) => {
            const t = this.phaseTime;

            // -- Spawn frequency increases with phase --
            let spawnInterval = 0.35;
            let spawnRadius = 14;

            // ---- Phase 1: Acceleration (0–3s) ----
            if (t < 3) {
                const ramp = easeInExpo(t / 3);
                warmStars.emitRate = ramp * 700;
                coolStars.emitRate = ramp * 1200;
                this.pipeline.chromaticAberration.aberrationAmount = 15 + ramp * 45;
                this.camera.rotation.z = Math.sin(t * 0.5) * 0.02 * ramp;
                spawnInterval = 0.5 - ramp * 0.3;
                spawnRadius = 18 - ramp * 6;
            }
            // ---- Phase 2: Full speed cruise (3–8s) ----
            else if (t < 8) {
                warmStars.emitRate = 700;
                coolStars.emitRate = 1400;
                flareStars.emitRate = 6;
                this.pipeline.chromaticAberration.aberrationAmount = 60;
                this.camera.rotation.z = Math.sin(t * 0.8) * 0.035;
                spawnInterval = 0.12;
                spawnRadius = 12;
            }
            // ---- Phase 3: Nebula passage (8–14s) ----
            else if (t < 14) {
                warmStars.emitRate = 500;
                coolStars.emitRate = 1000;
                flareStars.emitRate = 9;
                this.pipeline.bloomWeight = 0.7 + Math.sin(t * 1.5) * 0.35;
                this.camera.rotation.z = Math.sin(t * 0.6) * 0.045;
                spawnInterval = 0.18;
                spawnRadius = 10;
            }
            // ---- Phase 4: Star cluster — dense fly-through (14–18s) ----
            else if (t < 18) {
                warmStars.emitRate = 1000;
                coolStars.emitRate = 1800;
                flareStars.emitRate = 16;
                bgStars.emitRate = 500;
                this.pipeline.bloomWeight = 1.2;
                this.camera.rotation.z = Math.sin(t * 1.0) * 0.025;
                spawnInterval = 0.06;  // Very dense!
                spawnRadius = 8;
            }
            // ---- Phase 5: Deceleration & arrival (18–23s) ----
            else if (t < 23) {
                const decel = 1 - easeOutCubic((t - 18) / 5);
                warmStars.emitRate = decel * 700;
                coolStars.emitRate = decel * 1200;
                flareStars.emitRate = decel * 6;
                bgStars.emitRate = 200 + (1 - decel) * 80;
                if (coolStars.stretchFactor !== undefined)
                    coolStars.stretchFactor = 45 * decel + 2;
                if (warmStars.stretchFactor !== undefined)
                    warmStars.stretchFactor = 18 * decel + 2;
                this.pipeline.chromaticAberration.aberrationAmount =
                    60 * decel + 15;
                this.pipeline.bloomWeight = 0.7 + decel * 0.5;
                this.camera.rotation.z *= 0.96;
                spawnInterval = 0.15 + (1 - decel) * 0.5;
                spawnRadius = 10 + (1 - decel) * 10;
            }

            // Camera flies forward through space — FAST
            const cruiseSpeed = 6.0;
            const fwdSpeed = t < 18 ? cruiseSpeed : cruiseSpeed * Math.max(0, 1 - (t - 18) / 5);
            this.cameraTarget.z += dt * fwdSpeed;

            // Advance emitters ahead of camera
            const emZ = this.cameraTarget.z + 80;
            bgStars.emitter = new BABYLON.Vector3(0, 0, emZ - 10);
            warmStars.emitter = new BABYLON.Vector3(0, 0, emZ + 5);
            coolStars.emitter = new BABYLON.Vector3(0, 0, emZ + 20);
            flareStars.emitter = new BABYLON.Vector3(0, 0, emZ);

            // Look-at follows forward
            this.cameraLookAt = new BABYLON.Vector3(
                this.cameraTarget.x,
                this.cameraTarget.y,
                this.cameraTarget.z + 30
            );

            // Gentle drift for immersion
            this.cameraTarget.y = Math.sin(t * 0.28) * 2.0;
            this.cameraTarget.x = Math.sin(t * 0.19) * 2.8;

            // ---- 3D Flyby star spawning ----
            this._flybySpawnTimer -= dt;
            if (this._flybySpawnTimer <= 0 && t < 21) {
                this._spawnFlybyStar(spawnRadius);
                this._flybySpawnTimer = spawnInterval;
            }

            // ---- Cleanup & near-miss detection ----
            this._cleanupFlybyStars();
        };

        // --- Play out phases with audio accents ---
        // Phase 1-2: acceleration → cruise
        await wait(8000);
        this.audio.playSweep(true);

        // Phase 3: nebula passage
        await wait(6000);
        this.audio.playChime(392);

        // Phase 4: star cluster
        await wait(4000);
        this.audio.playSweep(false);

        // Phase 5: deceleration (slightly longer)
        await wait(5500);

        // Cleanup — stop warp, keep ambient background, dispose flyby stars
        this._warpUpdate = null;
        warmStars.emitRate = 0;
        coolStars.emitRate = 0;
        flareStars.emitRate = 0;
        bgStars.emitRate = 70;
        this.pipeline.chromaticAberration.aberrationAmount = 15;
        this.pipeline.bloomWeight = 0.6;
        this.camera.rotation.z = 0;
        // Dispose remaining flyby stars
        if (this._flybyStars) {
            this._flybyStars.forEach((s) => {
                if (s.mesh && !s.mesh.isDisposed()) s.mesh.dispose();
                if (s.glow && !s.glow.isDisposed()) s.glow.dispose();
                if (s.light) s.light.dispose();
            });
            this._flybyStars = [];
        }

        await wait(1000);
    }

    // ==========================================
    //  SCENE 3 — Planetary System  (10 – 18 s)
    // ==========================================
    async _scene3_Planetary() {
        this.phase = "planetary";
        this.phaseTime = 0;
        this.touchEnabled = true;

        // Position planet ahead of where the camera ended up
        const planetPos = new BABYLON.Vector3(0, 0, this.camera.position.z + 25);

        // ----- Planet -----
        const planet = BABYLON.MeshBuilder.CreateSphere(
            "planet",
            { diameter: 5, segments: 64 },
            this.scene
        );
        planet.position = planetPos.clone();
        const planetDT = new BABYLON.DynamicTexture("planetSurface", 1024, this.scene, true);
        const pctx = planetDT.getContext();

        // Paint surface
        const grad = pctx.createLinearGradient(0, 0, 1024, 1024);
        grad.addColorStop(0, "#1a0533");
        grad.addColorStop(0.2, "#2d1b69");
        grad.addColorStop(0.4, "#1e3a5f");
        grad.addColorStop(0.6, "#0d7377");
        grad.addColorStop(0.8, "#14274e");
        grad.addColorStop(1, "#1a0533");
        pctx.fillStyle = grad;
        pctx.fillRect(0, 0, 1024, 1024);

        // Atmospheric bands
        for (let i = 0; i < 12; i++) {
            const y = (1024 / 12) * i + Math.random() * 30;
            const h = 20 + Math.random() * 40;
            const r = 100 + Math.random() * 100;
            const g2 = 80 + Math.random() * 120;
            const b = 150 + Math.random() * 105;
            pctx.fillStyle = `rgba(${r},${g2},${b},0.15)`;
            pctx.fillRect(0, y, 1024, h);
        }

        // Cloud patches
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const sz = 8 + Math.random() * 50;
            pctx.beginPath();
            pctx.arc(x, y, sz, 0, Math.PI * 2);
            pctx.fillStyle = `rgba(${150 + Math.random() * 100},${180 + Math.random() * 75},${220 + Math.random() * 35},${0.04 + Math.random() * 0.1})`;
            pctx.fill();
        }
        planetDT.update();

        const planetMat = new BABYLON.StandardMaterial("planetMat", this.scene);
        planetMat.diffuseTexture = planetDT;
        planetMat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.25);
        planetMat.emissiveColor = new BABYLON.Color3(0.04, 0.03, 0.08);
        planet.material = planetMat;
        this.meshes.push(planet);

        // ----- Atmosphere glow -----
        const atmo = BABYLON.MeshBuilder.CreateSphere(
            "atmo",
            { diameter: 5.6, segments: 32 },
            this.scene
        );
        atmo.position = planetPos.clone();
        const atmoMat = new BABYLON.StandardMaterial("atmoMat", this.scene);
        atmoMat.emissiveColor = new BABYLON.Color3(0.15, 0.35, 0.7);
        atmoMat.alpha = 0.12;
        atmoMat.disableLighting = true;
        atmoMat.backFaceCulling = false;
        atmo.material = atmoMat;
        this.meshes.push(atmo);

        // ----- Ring system -----
        const ringParent = new BABYLON.TransformNode("ringParent", this.scene);
        ringParent.position = planetPos.clone();
        ringParent.rotation.x = Math.PI * 0.28;
        ringParent.rotation.z = Math.PI * 0.06;

        for (let i = 0; i < 25; i++) {
            const dia = 7 + i * 0.35;
            const r = BABYLON.MeshBuilder.CreateTorus(
                "ring" + i,
                { diameter: dia, thickness: 0.015 + Math.random() * 0.025, tessellation: 64 },
                this.scene
            );
            r.parent = ringParent;
            r.scaling.y = 0.015;
            const rm = new BABYLON.StandardMaterial("rm" + i, this.scene);
            const hue = (i * 15 + 30) % 360;
            const col = BABYLON.Color3.FromHSV(hue, 0.3, 0.8);
            rm.emissiveColor = col;
            rm.alpha = 0.2 + Math.random() * 0.35;
            rm.disableLighting = true;
            rm.backFaceCulling = false;
            r.material = rm;
            this.meshes.push(r);
        }

        // ----- Moons -----
        const moonData = [
            { dist: 6, size: 0.4, speed: 0.6, color: [0.6, 0.5, 0.8] },
            { dist: 8, size: 0.25, speed: 0.4, color: [0.8, 0.6, 0.4] },
            { dist: 10, size: 0.15, speed: 0.25, color: [0.4, 0.7, 0.6] },
        ];
        const moons = moonData.map((md, idx) => {
            const m = BABYLON.MeshBuilder.CreateSphere(
                "moon" + idx,
                { diameter: md.size, segments: 16 },
                this.scene
            );
            const mm = new BABYLON.StandardMaterial("moonMat" + idx, this.scene);
            mm.emissiveColor = new BABYLON.Color3(...md.color);
            mm.disableLighting = true;
            m.material = mm;
            this.meshes.push(m);
            return { mesh: m, ...md };
        });

        // ----- Sun light from the side -----
        const sunLight = new BABYLON.PointLight(
            "sunLight",
            new BABYLON.Vector3(-20, 10, 55),
            this.scene
        );
        sunLight.intensity = 30;
        sunLight.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

        // ----- Ambient star particles around the planet -----
        const ambientStars = new BABYLON.ParticleSystem(
            "ambientStars",
            800,
            this.scene
        );
        ambientStars.particleTexture = this.textures.star;
        ambientStars.emitter = planetPos.clone();
        ambientStars.minEmitBox = new BABYLON.Vector3(-50, -35, -30);
        ambientStars.maxEmitBox = new BABYLON.Vector3(50, 35, 30);
        ambientStars.direction1 = new BABYLON.Vector3(-0.02, -0.02, -0.02);
        ambientStars.direction2 = new BABYLON.Vector3(0.02, 0.02, 0.02);
        ambientStars.minEmitPower = 0;
        ambientStars.maxEmitPower = 0.5;
        ambientStars.minLifeTime = 4;
        ambientStars.maxLifeTime = 8;
        ambientStars.minSize = 0.02;
        ambientStars.maxSize = 0.08;
        ambientStars.emitRate = 100;
        ambientStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        ambientStars.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 0));
        ambientStars.addColorGradient(0.15, new BABYLON.Color4(1, 1, 1, 0.7));
        ambientStars.addColorGradient(0.4, new BABYLON.Color4(1, 0.95, 0.85, 0.5));
        ambientStars.addColorGradient(0.65, new BABYLON.Color4(0.8, 0.85, 1, 0.6));
        ambientStars.addColorGradient(0.85, new BABYLON.Color4(1, 1, 1, 0.3));
        ambientStars.addColorGradient(1, new BABYLON.Color4(1, 1, 1, 0));
        ambientStars.gravity = new BABYLON.Vector3(0, 0, 0);
        ambientStars.start();
        this.particleSystems.push(ambientStars);

        // Camera orbit update
        this._planetaryUpdate = (dt) => {
            const t = this.phaseTime;
            // Camera orbits the planet
            const orbitR = 14;
            const orbitSpeed = 0.25;
            const arriveT = Math.min(1, t / 3); // 3 seconds to arrive
            const arrived = easeOutCubic(arriveT);

            const targetX = Math.sin(t * orbitSpeed) * orbitR;
            const targetZ = planetPos.z + Math.cos(t * orbitSpeed) * orbitR;
            const targetY = Math.sin(t * 0.15) * 2 + 1;

            this.cameraTarget.x = targetX * arrived;
            this.cameraTarget.y = targetY * arrived;
            this.cameraTarget.z = lerp(-10, targetZ, arrived);
            this.cameraLookAt = planetPos.clone();

            // Rotate planet
            planet.rotation.y += dt * 0.15;

            // Orbit moons
            moons.forEach((md) => {
                const a = t * md.speed;
                md.mesh.position.x = planetPos.x + Math.cos(a) * md.dist;
                md.mesh.position.z = planetPos.z + Math.sin(a) * md.dist;
                md.mesh.position.y =
                    planetPos.y + Math.sin(a * 1.5) * md.dist * 0.2;
            });

            // Ring parent slow rotation
            ringParent.rotation.y += dt * 0.05;
        };

        await wait(8000);
        this._planetaryUpdate = null;
    }

    // ==========================================
    //  SCENE 4 — Message Reveal  (18 – 26 s)
    // ==========================================
    async _scene4_Message() {
        this.phase = "message";
        this.phaseTime = 0;

        // Show the overlay
        const overlay = document.getElementById("overlay");
        overlay.classList.add("visible");

        const container = document.getElementById("message-container");
        container.innerHTML = "";

        this.audio.playMelody();

        // 名前が未選択の場合は config.js の設定から組み立てる
        // (コード内に名前を直接書くと、config.js を書き換えても反映されないため)
        const configuredNames = ((window.APP_CONFIG && window.APP_CONFIG.players) || [])
            .map((p) => p.name)
            .filter(Boolean)
            .join(" と ");
        const playerName = this.selectedPlayer
            ? `${this.selectedPlayer} <ruby>冒険者<rt>ぼうけんしゃ</rt></ruby>`
            : (configuredNames || "ようこそ");
        // お約束の文言は config.js の設定から組み立てる。
        // (以前はここだけ別の固定文言を直接書いていたため、演出中に見せる約束と
        //  実際に同意するモーダル・証明書に記載される約束の文言が食い違っていた)
        const scenePromises =
            (window.APP_CONFIG && window.APP_CONFIG.promises) ||
            WelcomeExperience.DEFAULT_PROMISES;
        const promiseDelays = [4600, 5800, 7000];
        const messages = [
            { text: playerName, cls: "name-line", delay: 0 },
            { text: "ようこそ、<ruby>新<rt>あたら</rt></ruby>しい<ruby>世界<rt>せかい</rt></ruby>へ", cls: "hero", delay: 1000 },
            {
                text: "<ruby>自分<rt>じぶん</rt></ruby>だけの<ruby>特別<rt>とくべつ</rt></ruby>なタブレットライフがはじまります！",
                cls: "sub",
                delay: 2200,
            },
            {
                text: "✨ 〜 スマートにつかう 3つの<ruby>誓<rt>ちか</rt></ruby>い 〜",
                cls: "sub promise-title",
                delay: 3400,
            },
            ...scenePromises.slice(0, 3).map((text, i) => ({
                text,
                cls: "sub promise-line",
                delay: promiseDelays[i] ?? 4600 + i * 1200,
            })),
        ];

        // Create message lines
        messages.forEach((m) => {
            const div = document.createElement("div");
            div.className = `message-line ${m.cls}`;
            div.innerHTML = m.text;
            container.appendChild(div);
        });

        // Reveal messages with stagger
        for (const m of messages) {
            await wait(m.delay === 0 ? 800 : m.delay - (messages.indexOf(m) > 0 ? messages[messages.indexOf(m) - 1].delay : 0));
            const idx = messages.indexOf(m);
            container.children[idx].classList.add("visible");
            if (idx > 0) this.audio.playChime(440 + idx * 80);
        }

        await wait(2000);
    }

    // ==========================================
    //  SCENE 5 — Start Button  (26 s –)
    // ==========================================
    async _scene5_Start() {
        this.phase = "start";
        this.phaseTime = 0;

        const btn = document.getElementById("start-button");
        btn.classList.remove("hidden");
        await wait(100);
        btn.classList.add("visible");

        this.audio.playChime(783.99);

        return new Promise((resolve) => {
            const btn = document.getElementById("start-button");
            const modal = document.getElementById("confirm-modal");
            const yesBtn = document.getElementById("modal-yes-button");
            const noBtn = document.getElementById("modal-no-button");
            const promisesBox = document.getElementById("modal-promises-list");

            const openModal = (e) => {
                e?.stopPropagation();
                this.audio.playChime(523.25);

                // Populate promises list
                if (promisesBox) {
                    const promises = (window.APP_CONFIG && window.APP_CONFIG.promises) || WelcomeExperience.DEFAULT_PROMISES;
                    promisesBox.innerHTML = promises.map((p, i) => `
                        <div class="promise-item-card">
                            <span class="promise-icon">✦</span>
                            <span class="promise-text">${p}</span>
                        </div>
                    `).join('');
                }

                modal.classList.remove("hidden");
                requestAnimationFrame(() => modal.classList.add("visible"));
            };

            const closeModal = () => {
                modal.classList.remove("visible");
                setTimeout(() => modal.classList.add("hidden"), 300);
            };

            const onCancelNo = (e) => {
                e?.stopPropagation();
                this.audio.playChime(392.00);
                closeModal();
            };

            const onConfirmYes = async (e) => {
                e?.stopPropagation();
                yesBtn.removeEventListener("click", onConfirmYes);
                noBtn.removeEventListener("click", onCancelNo);
                btn.removeEventListener("click", openModal);
                closeModal();

                // Save Smart Certificate (SSBL.storage 経由。runtime.js 参照)
                try {
                    const now = new Date();
                    const formattedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const certPromises = (window.APP_CONFIG && window.APP_CONFIG.promises) || WelcomeExperience.DEFAULT_PROMISES;
                    const certData = {
                        playerName: this.selectedPlayer || "",
                        timestamp: formattedDate,
                        promises: certPromises
                    };
                    SSBL.storage.set('adventureCertificate', JSON.stringify(certData));
                } catch (err) {
                    console.error("Failed to save certificate:", err);
                }

                // ---- Celebration Finale! ----
                this.audio.playFirework();
                this._startShake(0.3, 1);

                // Sparkling celebration fireworks
                for (let i = 0; i < 8; i++) {
                    this._emitFirework(
                        new BABYLON.Vector3(
                            (Math.random() - 0.5) * 20,
                            (Math.random() - 0.5) * 15,
                            this.camera.position.z + 15 + Math.random() * 10
                        )
                    );
                    await wait(180);
                }

                this.pipeline.bloomWeight = 3;
                await wait(1200);

                // Fade everything out
                this.audio.fadeOut(3);
                const overlay = document.getElementById("overlay");

                // Create completion screen
                const completion = document.createElement("div");
                completion.id = "completion-screen";

                const completionText = document.createElement("div");
                completionText.className = "completion-text";
                completionText.innerHTML = "✨ <ruby>初<rt>はじ</rt></ruby>めてのタブレット<ruby>契約<rt>けいやく</rt></ruby>・<ruby>同意<rt>どうい</rt></ruby>おめでとう！ ✨<br><span style='font-size: 0.7em; font-weight: normal; color: #f3e5ab;'>タブレット・<ruby>正規<rt>せいき</rt></ruby>オーナー<ruby>証明書<rt>しょうめいしょ</rt></ruby>が<ruby>発行<rt>はっこう</rt></ruby>されました 👑</span>";
                completion.appendChild(completionText);

                const hintText = document.createElement("div");
                hintText.className = "completion-hint";
                hintText.innerHTML = "💖 <ruby>画面<rt>がめん</rt></ruby>をタップしてデジタル<ruby>証明<rt>しょうめい</rt></ruby>カードを<ruby>開<rt>ひら</rt></ruby>く";
                completion.appendChild(hintText);

                const timerBar = document.createElement("div");
                timerBar.className = "completion-timer-bar";
                const timerFill = document.createElement("div");
                timerFill.className = "completion-timer-fill";
                timerBar.appendChild(timerFill);
                completion.appendChild(timerBar);

                document.body.appendChild(completion);

                await wait(300);
                overlay.classList.remove("visible");
                completion.classList.add("visible");
                await wait(500);
                completionText.classList.add("visible");
                await wait(800);
                hintText.classList.add("visible");

                // Start 30-second countdown
                timerFill.style.transition = "width 30s linear";
                await wait(50);
                timerFill.style.width = "0%";

                // Close handler
                const closeScreen = async () => {
                    completion.removeEventListener("pointerdown", closeScreen);
                    clearTimeout(autoCloseTimer);

                    // Fade to black
                    completion.style.transition = "opacity 1.5s ease";
                    completion.style.opacity = "0";
                    await wait(1500);

                    // Stop Babylon engine
                    this.engine.stopRenderLoop();
                    this.scene.dispose();
                    this.engine.dispose();
                    this.canvas.style.display = "none";
                    completion.remove();

                    // Black screen — experience is over
                    document.body.style.background = "#000";
                    window.parent.postMessage({ type: "EXPERIENCE_COMPLETE" }, "*");
                    // 単一ファイル版では、この時点で3Dエンジンを破棄済みのため
                    // 「もう一度見る」時は作り直しではなくリロードで復帰させる(シェル側で判定)
                    window.__ssblIntroFinished = true;
                    SSBL.navigate('dashboard');
                    resolve();
                };

                // Tap to close
                completion.addEventListener("pointerdown", closeScreen);

                // Auto-close after 30 seconds
                const autoCloseTimer = setTimeout(closeScreen, 30000);
            };

            btn.addEventListener("click", openModal);
            yesBtn.addEventListener("click", onConfirmYes);
            noBtn.addEventListener("click", onCancelNo);
        });
    }

    // ==========================================
    //  Touch Interaction
    // ==========================================
    _setupTouch() {
        this.canvas.addEventListener("pointerdown", (evt) => {
            if (!this.touchEnabled) return;

            // 3D sparkle at pick point
            const pickRay = this.scene.createPickingRay(
                evt.clientX,
                evt.clientY,
                BABYLON.Matrix.Identity(),
                this.camera
            );
            let point;
            const pick = this.scene.pickWithRay(pickRay);
            if (pick && pick.hit) {
                point = pick.pickedPoint;
            } else {
                point = pickRay.origin.add(pickRay.direction.scale(18));
            }
            this._emitTouchSparkle(point);
            this.audio.playSparkle();

            // CSS ripple
            const ripple = document.createElement("div");
            ripple.className = "touch-ripple";
            ripple.style.left = evt.clientX - 8 + "px";
            ripple.style.top = evt.clientY - 8 + "px";
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    }

    _emitTouchSparkle(position) {
        const burst = new BABYLON.ParticleSystem("touchBurst", 120, this.scene);
        burst.particleTexture = this.textures.flare;
        burst.emitter = position.clone();
        burst.createSphereEmitter(0.3);
        burst.minLifeTime = 0.3;
        burst.maxLifeTime = 1.0;
        burst.minSize = 0.06;
        burst.maxSize = 0.2;
        burst.minEmitPower = 4;
        burst.maxEmitPower = 16;
        burst.emitRate = 0;
        burst.manualEmitCount = 80;
        burst.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        // Rainbow-ish gradient
        const hue = Math.random() * 360;
        const c1 = BABYLON.Color3.FromHSV(hue, 0.6, 1);
        const c2 = BABYLON.Color3.FromHSV((hue + 60) % 360, 0.7, 1);
        const c3 = BABYLON.Color3.FromHSV((hue + 180) % 360, 0.5, 0.8);
        burst.addColorGradient(
            0,
            new BABYLON.Color4(c1.r, c1.g, c1.b, 1)
        );
        burst.addColorGradient(
            0.4,
            new BABYLON.Color4(c2.r, c2.g, c2.b, 0.8)
        );
        burst.addColorGradient(
            1,
            new BABYLON.Color4(c3.r, c3.g, c3.b, 0)
        );

        burst.addSizeGradient(0, 0.15);
        burst.addSizeGradient(0.5, 0.08);
        burst.addSizeGradient(1, 0.01);
        burst.gravity = new BABYLON.Vector3(0, -2, 0);
        burst.start();
        setTimeout(() => burst.dispose(), 1500);
    }

    // ==========================================
    //  Firework Burst
    // ==========================================
    _emitFirework(position) {
        const colors = [
            { h: 45, s: 0.9 },   // Gold
            { h: 330, s: 0.8 },   // Pink
            { h: 200, s: 0.7 },   // Blue
            { h: 280, s: 0.8 },   // Purple
            { h: 120, s: 0.6 },   // Green
        ];
        const pick = colors[Math.floor(Math.random() * colors.length)];

        const fw = new BABYLON.ParticleSystem("fw", 300, this.scene);
        fw.particleTexture = this.textures.star;
        fw.emitter = position.clone();
        fw.createSphereEmitter(0.5);
        fw.minLifeTime = 0.8;
        fw.maxLifeTime = 2.0;
        fw.minSize = 0.05;
        fw.maxSize = 0.2;
        fw.minEmitPower = 8;
        fw.maxEmitPower = 25;
        fw.emitRate = 0;
        fw.manualEmitCount = 250;
        fw.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        const c1 = BABYLON.Color3.FromHSV(pick.h, pick.s, 1);
        const c2 = BABYLON.Color3.FromHSV((pick.h + 40) % 360, pick.s * 0.7, 0.9);
        fw.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 1));
        fw.addColorGradient(0.2, new BABYLON.Color4(c1.r, c1.g, c1.b, 1));
        fw.addColorGradient(0.6, new BABYLON.Color4(c2.r, c2.g, c2.b, 0.7));
        fw.addColorGradient(1, new BABYLON.Color4(c2.r * 0.3, c2.g * 0.3, c2.b * 0.3, 0));

        fw.addSizeGradient(0, 0.12);
        fw.addSizeGradient(0.3, 0.2);
        fw.addSizeGradient(1, 0.02);
        fw.gravity = new BABYLON.Vector3(0, -3, 0);
        fw.start();
        setTimeout(() => fw.dispose(), 2500);
    }

    // ==========================================
    //  3D Flyby Star Management
    // ==========================================

    /** Spawn a 3D star object ahead of the camera — with rich decoration */
    _spawnFlybyStar(maxRadius = 12) {
        const camZ = this.cameraTarget.z;
        const distance = 35 + Math.random() * 55;

        // Position around the flight path
        const angle = Math.random() * Math.PI * 2;
        const minR = 1.0;
        const radius = minR + Math.pow(Math.random(), 0.7) * (maxRadius - minR);
        const x = Math.cos(angle) * radius + this.cameraTarget.x;
        const y = Math.sin(angle) * radius + this.cameraTarget.y;
        const z = camZ + distance;
        const pos = new BABYLON.Vector3(x, y, z);

        // Star types — expanded
        const types = [
            { color: [1, 0.95, 0.75], size: 0.35, glow: 2.5, ring: 0.15, corona: 0.2,  orbit: 0.1,  pulse: 0.8 },
            { color: [0.6, 0.78, 1],  size: 0.22, glow: 2.0, ring: 0.05, corona: 0.3,  orbit: 0.05, pulse: 1.2 },
            { color: [1, 0.4, 0.15],  size: 0.8,  glow: 3.8, ring: 0.35, corona: 0.5,  orbit: 0.2,  pulse: 0.4 },
            { color: [1, 1, 1],       size: 0.15, glow: 1.8, ring: 0,    corona: 0.15, orbit: 0,    pulse: 2.0 },
            { color: [0.75, 0.5, 1],  size: 0.3,  glow: 2.5, ring: 0.2,  corona: 0.25, orbit: 0.08, pulse: 0.9 },
            { color: [0.3, 0.95, 0.8],size: 0.24, glow: 2.2, ring: 0.1,  corona: 0.2,  orbit: 0.06, pulse: 1.5 },
            { color: [1, 0.8, 0.3],   size: 0.6,  glow: 3.2, ring: 0.3,  corona: 0.4,  orbit: 0.15, pulse: 0.5 },
            { color: [0.9, 0.3, 0.5], size: 0.28, glow: 2.3, ring: 0.12, corona: 0.2,  orbit: 0.07, pulse: 1.1 },
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const col = new BABYLON.Color3(...type.color);

        // --- Core sphere ---
        const star = BABYLON.MeshBuilder.CreateSphere(
            "flyby", { diameter: type.size, segments: 10 }, this.scene
        );
        star.position.copyFrom(pos);
        const mat = new BABYLON.StandardMaterial("fmat", this.scene);
        mat.emissiveColor = col;
        mat.disableLighting = true;
        star.material = mat;

        // --- Glow halo ---
        const glowSize = type.size * type.glow;
        const glow = BABYLON.MeshBuilder.CreateSphere(
            "fglow", { diameter: glowSize, segments: 8 }, this.scene
        );
        glow.position.copyFrom(pos);
        const gMat = new BABYLON.StandardMaterial("fgmat", this.scene);
        gMat.emissiveColor = col;
        gMat.alpha = 0.1 + type.size * 0.08;
        gMat.disableLighting = true;
        gMat.backFaceCulling = false;
        glow.material = gMat;

        // --- Point light for larger stars ---
        let light = null;
        if (type.size >= 0.4 && Math.random() < 0.6) {
            light = new BABYLON.PointLight("fpl", pos.clone(), this.scene);
            light.intensity = type.size * 10;
            light.diffuse = col;
            light.range = type.size * 25;
        }

        // --- Rings (torus at random angles) ---
        const rings = [];
        if (Math.random() < type.ring) {
            const ringCount = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < ringCount; i++) {
                const rDia = type.size * (3.5 + i * 1.2 + Math.random());
                const r = BABYLON.MeshBuilder.CreateTorus(
                    "fring", { diameter: rDia, thickness: 0.01 + Math.random() * 0.015, tessellation: 48 }, this.scene
                );
                r.position.copyFrom(pos);
                r.rotation.x = Math.random() * Math.PI;
                r.rotation.z = Math.random() * Math.PI * 0.5;
                r.scaling.y = 0.02;
                const rMat = new BABYLON.StandardMaterial("frmat", this.scene);
                const hueShift = i * 30;
                rMat.emissiveColor = BABYLON.Color3.FromHSV(
                    (col.toHSV().r + hueShift) % 360, 0.4, 0.9
                );
                rMat.alpha = 0.25 + Math.random() * 0.3;
                rMat.disableLighting = true;
                rMat.backFaceCulling = false;
                r.material = rMat;
                rings.push(r);
            }
        }

        // --- Corona flare plane (billboard) ---
        let corona = null;
        if (Math.random() < type.corona) {
            const cSize = type.size * (4 + Math.random() * 3);
            corona = BABYLON.MeshBuilder.CreatePlane(
                "fcorona", { size: cSize }, this.scene
            );
            corona.position.copyFrom(pos);
            corona.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            const cMat = new BABYLON.StandardMaterial("fcmat", this.scene);
            cMat.emissiveTexture = this.textures.flare;
            cMat.emissiveColor = col;
            cMat.opacityTexture = this.textures.flare;
            cMat.alpha = 0.2 + type.size * 0.15;
            cMat.disableLighting = true;
            cMat.backFaceCulling = false;
            corona.material = cMat;
        }

        // --- Orbiting mini-bodies ---
        const orbiters = [];
        if (Math.random() < type.orbit) {
            const orbCount = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < orbCount; i++) {
                const orbSize = 0.03 + Math.random() * 0.06;
                const orb = BABYLON.MeshBuilder.CreateSphere(
                    "forb", { diameter: orbSize, segments: 6 }, this.scene
                );
                const oMat = new BABYLON.StandardMaterial("fomat", this.scene);
                oMat.emissiveColor = BABYLON.Color3.FromHSV(
                    Math.random() * 360, 0.5, 0.9
                );
                oMat.disableLighting = true;
                orb.material = oMat;
                orbiters.push({
                    mesh: orb,
                    dist: type.size * (1.5 + i * 0.8 + Math.random()),
                    speed: 2 + Math.random() * 4,
                    phase: Math.random() * Math.PI * 2,
                    tilt: (Math.random() - 0.5) * 0.6,
                });
            }
        }

        this._flybyStars.push({
            mesh: star,
            glow,
            light,
            rings,
            corona,
            orbiters,
            type,
            radius,
            passed: false,
            pulseSpeed: type.pulse + Math.random() * 0.5,
            pulsePhase: Math.random() * Math.PI * 2,
            baseSize: type.size,
        });
    }

    /** Update, animate, cleanup flyby stars & detect near-misses */
    _cleanupFlybyStars() {
        const camZ = this.camera.position.z;
        const camX = this.camera.position.x;
        const camY = this.camera.position.y;
        const time = this.totalTime;

        this._flybyStars = this._flybyStars.filter((s) => {
            const sz = s.mesh.position.z;

            // --- Pulsation animation ---
            const pulse = 1 + Math.sin(time * s.pulseSpeed + s.pulsePhase) * 0.15;
            const scl = s.baseSize * pulse;
            s.mesh.scaling.setAll(pulse);
            if (s.glow && !s.glow.isDisposed()) {
                s.glow.scaling.setAll(pulse);
            }

            // --- Orbiter animation ---
            if (s.orbiters) {
                const starPos = s.mesh.position;
                s.orbiters.forEach((o) => {
                    const a = time * o.speed + o.phase;
                    o.mesh.position.x = starPos.x + Math.cos(a) * o.dist;
                    o.mesh.position.z = starPos.z + Math.sin(a) * o.dist;
                    o.mesh.position.y = starPos.y + Math.sin(a * 1.3) * o.dist * o.tilt;
                });
            }

            // --- Ring rotation ---
            if (s.rings) {
                s.rings.forEach((r) => {
                    if (!r.isDisposed()) r.rotation.y += 0.02;
                });
            }

            // --- Near-miss detection ---
            if (!s.passed && sz < camZ + 2) {
                s.passed = true;
                const dx = s.mesh.position.x - camX;
                const dy = s.mesh.position.y - camY;
                const dist2D = Math.sqrt(dx * dx + dy * dy);
                if (dist2D < 4) {
                    this.audio.playSparkle();
                    if (dist2D < 2.5) {
                        this._startShake(0.18, 0.35);
                        this.pipeline.bloomWeight = Math.min(
                            2.2, this.pipeline.bloomWeight + 0.7
                        );
                    }
                }
            }

            // --- Dispose when far behind ---
            if (sz < camZ - 10) {
                s.mesh.dispose();
                if (s.glow && !s.glow.isDisposed()) s.glow.dispose();
                if (s.light) s.light.dispose();
                if (s.corona && !s.corona.isDisposed()) s.corona.dispose();
                if (s.rings) s.rings.forEach((r) => { if (!r.isDisposed()) r.dispose(); });
                if (s.orbiters) s.orbiters.forEach((o) => { if (!o.mesh.isDisposed()) o.mesh.dispose(); });
                return false;
            }
            return true;
        });
    }

    // ==========================================
    //  Camera Shake
    // ==========================================
    _startShake(intensity, duration) {
        this.shaking = true;
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeStart = this.totalTime;
        this.shakeBasePos = this.camera.position.clone();
    }

    // ==========================================
    //  Per-frame update
    // ==========================================
    _update(dt) {
        // Camera smooth follow
        const speed = 1.5;
        this.camera.position.x = lerp(
            this.camera.position.x,
            this.cameraTarget.x,
            dt * speed
        );
        this.camera.position.y = lerp(
            this.camera.position.y,
            this.cameraTarget.y,
            dt * speed
        );
        this.camera.position.z = lerp(
            this.camera.position.z,
            this.cameraTarget.z,
            dt * speed
        );

        // Camera look-at
        const currentTarget = this.camera.getTarget();
        const lx = lerp(currentTarget.x, this.cameraLookAt.x, dt * 2);
        const ly = lerp(currentTarget.y, this.cameraLookAt.y, dt * 2);
        const lz = lerp(currentTarget.z, this.cameraLookAt.z, dt * 2);
        this.camera.setTarget(new BABYLON.Vector3(lx, ly, lz));

        // Camera shake
        if (this.shaking) {
            const elapsed = this.totalTime - this.shakeStart;
            if (elapsed > this.shakeDuration) {
                this.shaking = false;
            } else {
                const decay = 1 - elapsed / this.shakeDuration;
                const i = this.shakeIntensity * decay;
                this.camera.position.x += (Math.random() - 0.5) * i;
                this.camera.position.y += (Math.random() - 0.5) * i;
            }
        }

        // Phase-specific updates
        if (this._warpUpdate) {
            this._warpUpdate(dt);
        }
        if (this._planetaryUpdate) {
            this._planetaryUpdate(dt);
        }

        // Gentle camera bob during message / start phases
        if (this.phase === "message" || this.phase === "start") {
            this.cameraTarget.y = Math.sin(this.totalTime * 0.3) * 0.5;
        }
    }
}

// ============================================
//  Initialise on DOM ready
// ============================================
// イントロ体験の起動。
// 単一ファイル版ではイントロ画面を表示するタイミングでシェルから呼ばれる
// (証明書発行済みでダッシュボード直行する場合に、3Dエンジンを無駄に起動しないため)。
function ssblStartIntro() {
    if (window.__ssblIntroStarted) return;
    window.__ssblIntroStarted = true;
    const app = new WelcomeExperience();
    app.init();
}
window.SSBL_START_INTRO = ssblStartIntro;

document.addEventListener("DOMContentLoaded", () => {
    // 単一ファイル版では、どの画面から始めるかはシェルが判断して起動する
    if (typeof window.SSBL_SHOW_VIEW === "function") return;
    ssblStartIntro();
});
