/* ============================================================
   KAMIGUCHI ODONTOLOGIA — script.js · v2
   1. Aurora "dança de cor" (hero + seção invisível) + bokeh
   2. Split-text: títulos entram palavra por palavra
   3. Cursor customizado com rótulo + botões magnéticos
   4. Reveals de scroll
   5. Acordeões (especialidades + FAQ)
   6. Carrossel de avaliações (arraste + setas + autoplay)
   7. Wizard de agendamento em 3 passos → WhatsApp
   8. Header / menu mobile
   Gates: prefers-reduced-motion, pointer:fine, ?noanim, ?shot=<id>
   ============================================================ */
(() => {
  "use strict";

  /* ---------- gates ---------- */
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  const noAnim = params.has("noanim") || !!shot;
  if (noAnim) document.documentElement.classList.add("noanim");
  if (shot && document.getElementById(shot)) {
    const target = document.getElementById(shot);
    document.querySelectorAll("body > *").forEach((el) => {
      if (el !== target && !el.contains(target)) el.style.display = "none";
    });
  }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches || noAnim;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* posição do mouse compartilhada (normalizada) */
  const mouse = { x: .5, y: .5 };
  if (finePointer && !reduceMotion) {
    addEventListener("pointermove", (e) => {
      mouse.x = e.clientX / innerWidth;
      mouse.y = e.clientY / innerHeight;
    });
  }

  /* ============================================================
     1. AURORA — blobs enormes cujas cores dançam pela paleta
        (petróleo → menta → âmbar → coral), com parallax de mouse.
        opts.bokeh adiciona a camada de luzes desfocadas por cima.
     ============================================================ */
  const PALETTE = [
    { h: 188, s: 60, l: 50 },  // petróleo
    { h: 162, s: 46, l: 56 },  // menta
    { h: 38,  s: 84, l: 58 },  // âmbar
    { h: 14,  s: 66, l: 56 },  // coral
  ];
  function paletteColor(u) { // u contínuo → cor interpolada da paleta (com wrap)
    const n = PALETTE.length;
    const i = Math.floor(((u % n) + n) % n);
    const f = ((u % 1) + 1) % 1;
    const a = PALETTE[i], b = PALETTE[(i + 1) % n];
    const t = f * f * (3 - 2 * f); // smoothstep
    // caminho curto do matiz
    let dh = b.h - a.h; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
    return { h: a.h + dh * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t };
  }
  const rand = (a, b) => a + Math.random() * (b - a);

  class AuroraField {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({ bokeh: false, base: false, intensity: 1, blobCount: 6, sparks: false }, opts);
      this.sparks = [];
      this.W = 0; this.H = 0;
      this.mx = .5; this.my = .5;   // mouse suavizado
      this.t = rand(0, 100);
      this.running = true;
      this.resize();
      // checkSize só re-semeia se as dimensões realmente mudaram (teclado
      // mobile/colapso da barra de URL disparam resize sem mudar o canvas)
      addEventListener("resize", () => this.checkSize());
      // pausa quando fora da tela
      new IntersectionObserver((en) => { this.running = en[0].isIntersecting; }, { threshold: 0 })
        .observe(canvas);
      this.loop = this.loop.bind(this);
      this.loop();
      document.addEventListener("visibilitychange", () => { this.checkSize(); this.draw(); });
      // rastro de faíscas quentes seguindo o mouse (só desktop, só com animação)
      if (this.opts.sparks && finePointer && !reduceMotion) {
        canvas.parentElement.addEventListener("pointermove", (e) => {
          const r = canvas.getBoundingClientRect();
          for (let k = 0; k < 4; k++) {
            if (this.sparks.length > 220) this.sparks.shift();
            this.sparks.push({
              x: e.clientX - r.left + rand(-10, 10), y: e.clientY - r.top + rand(-10, 10),
              vx: rand(-.7, .7), vy: rand(-1.8, -.4),
              r: rand(1.4, 4.2), life: 1, hue: rand(32, 54),
            });
          }
        });
      }
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.W = this.canvas.clientWidth; this.H = this.canvas.clientHeight;
      this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.seed();
      this.draw();   // sob reduced-motion não há loop — redesenha já, senão o canvas fica em branco
    }
    checkSize() {
      if (this.canvas.clientWidth !== this.W || this.canvas.clientHeight !== this.H) this.resize();
    }
    seed() {
      const { W, H } = this;
      this.blobs = [];
      for (let i = 0; i < this.opts.blobCount; i++) {
        this.blobs.push({
          px: rand(0, Math.PI * 2), py: rand(0, Math.PI * 2),
          sx: rand(.05, .16), sy: rand(.04, .13),
          r: rand(.28, .55) * Math.max(W, H),
          depth: rand(.3, 1),
          hueU: rand(0, PALETTE.length),      // posição na paleta
          hueSpeed: rand(.022, .05),          // velocidade da dança de cor
          alpha: rand(.14, .26),
        });
      }
      this.lights = [];
      if (this.opts.bokeh) {
        const n = Math.round(Math.min(30, Math.max(14, W / 55)));
        for (let i = 0; i < n; i++) {
          const warm = Math.random() < 0.7;
          this.lights.push({
            x: rand(0, W), y: rand(0, H),
            r: rand(10, Math.min(90, W * .07)),
            depth: rand(.25, 1),
            hue: warm ? rand(30, 48) : rand(160, 185),
            sat: warm ? rand(55, 80) : rand(22, 38),
            alpha: rand(.07, .17),
            vx: rand(-.07, .07), vy: rand(-.05, .05),
            phase: rand(0, Math.PI * 2),
          });
        }
      }
    }
    draw() {
      const { ctx, W, H, opts } = this;
      const t = this.t;
      ctx.clearRect(0, 0, W, H);
      if (opts.base) {
        const bg = ctx.createLinearGradient(0, 0, W * .3, H);
        bg.addColorStop(0, "#0D343B"); bg.addColorStop(1, "#092227");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      }
      // tremor de câmera
      const shX = reduceMotion ? 0 : Math.sin(t * 1.7) * 1.2 + Math.sin(t * 3.1) * .5;
      const shY = reduceMotion ? 0 : Math.cos(t * 1.3) * 1.0 + Math.sin(t * 2.6) * .4;
      // parallax suavizado
      this.mx += (mouse.x - this.mx) * .05;
      this.my += (mouse.y - this.my) * .05;

      ctx.globalCompositeOperation = "lighter";

      // aurora: blobs que dançam de cor e de lugar
      for (const b of this.blobs) {
        const x = W * (.5 + .44 * Math.sin(t * b.sx + b.px) * Math.cos(t * b.sy * .7 + b.py))
                + (this.mx - .5) * 190 * b.depth + shX * b.depth;
        const y = H * (.5 + .42 * Math.cos(t * b.sy + b.py) * Math.sin(t * b.sx * .6 + b.px))
                + (this.my - .5) * 140 * b.depth + shY * b.depth;
        const c = paletteColor(b.hueU + t * b.hueSpeed);
        const r = b.r * (1 + Math.sin(t * .5 + b.px) * .12);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = b.alpha * b.depth * opts.intensity;
        g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`);
        g.addColorStop(.6, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a * .4})`);
        g.addColorStop(1, `hsla(${c.h}, ${c.s}%, ${c.l}%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }

      // bokeh: luzes pequenas por cima da aurora
      for (const L of this.lights) {
        if (!reduceMotion) {
          L.x += L.vx; L.y += L.vy;
          if (L.x < -L.r) L.x = W + L.r; if (L.x > W + L.r) L.x = -L.r;
          if (L.y < -L.r) L.y = H + L.r; if (L.y > H + L.r) L.y = -L.r;
        }
        const pulse = 1 + Math.sin(t * .8 + L.phase) * .12;
        const px = L.x + (this.mx - .5) * 46 * L.depth + shX * L.depth;
        const py = L.y + (this.my - .5) * 30 * L.depth + shY * L.depth;
        const r = L.r * pulse;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        const c = `hsla(${L.hue}, ${L.sat}%, 62%,`;
        g.addColorStop(0, c + (L.alpha * L.depth) + ")");
        g.addColorStop(.55, c + (L.alpha * L.depth * .45) + ")");
        g.addColorStop(1, c + "0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }

      // faíscas do mouse: sobem, apagam e somem
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.x += s.vx; s.y += s.vy; s.vy -= .01; s.life -= .016;
        if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
        const g2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
        g2.addColorStop(0, `hsla(${s.hue}, 90%, 65%, ${s.life * .85})`);
        g2.addColorStop(1, `hsla(${s.hue}, 90%, 65%, 0)`);
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2); ctx.fill();
      }

      // light leak diagonal a cada ~16s (só no hero)
      if (!reduceMotion && opts.base) {
        const cycle = (t % 11) / 11;
        if (cycle < .45) {
          const p = cycle / .45;
          const x = -W * .6 + p * W * 2.2;
          const leak = ctx.createLinearGradient(x, 0, x + W * .5, H);
          const a = Math.sin(p * Math.PI) * .075;
          leak.addColorStop(0, "hsla(36, 90%, 60%, 0)");
          leak.addColorStop(.5, `hsla(36, 90%, 60%, ${a})`);
          leak.addColorStop(1, "hsla(20, 90%, 55%, 0)");
          ctx.fillStyle = leak; ctx.fillRect(0, 0, W, H);
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }
    loop() {
      if (this.running) { this.checkSize(); this.t += .016; this.draw(); }
      if (!reduceMotion) requestAnimationFrame(this.loop);
    }
  }

  const heroCanvas = document.querySelector(".hero-canvas");
  if (heroCanvas) new AuroraField(heroCanvas, { bokeh: true, base: true, intensity: 1.25, blobCount: 8, sparks: true });
  const invCanvas = document.querySelector(".inv-canvas");
  if (invCanvas) new AuroraField(invCanvas, { bokeh: false, base: false, intensity: .7, blobCount: 6 });

  /* ============================================================
     2. SPLIT-TEXT — palavras dos títulos sobem uma a uma
     ============================================================ */
  const splitEls = document.querySelectorAll("[data-split]");
  if (!reduceMotion) {
    splitEls.forEach((el) => {
      const letters = el.dataset.split === "letters";   // hero: letra a letra
      (function walk(node) {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === 3 && child.textContent.trim()) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const w = document.createElement("span"); w.className = "w";
              if (letters) {
                [...part].forEach((ch) => {
                  const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = ch;
                  w.appendChild(wi);
                });
              } else {
                const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
                w.appendChild(wi);
              }
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
        });
      })(el);
      const stepD = letters ? .028 : .06;
      el.querySelectorAll(".wi").forEach((wi, i) => wi.style.setProperty("--d", (i * stepD) + "s"));
    });
    // hero anima na carga; os demais quando entram na tela
    const heroTitle = document.querySelector(".hero-title[data-split]");
    if (heroTitle) requestAnimationFrame(() => setTimeout(() => heroTitle.classList.add("split-in"), 150));
    const splitIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("split-in"); splitIO.unobserve(en.target); }
      });
    }, { threshold: .3 });
    splitEls.forEach((el) => { if (el !== heroTitle) splitIO.observe(el); });
  } else {
    splitEls.forEach((el) => el.classList.add("split-in"));
  }

  /* ============================================================
     3. CURSOR + MAGNÉTICOS
     ============================================================ */
  if (finePointer && !reduceMotion) {
    document.body.classList.add("has-cursor");
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const label = document.querySelector(".cursor-label");
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };

    addEventListener("pointermove", (e) => { pos.x = e.clientX; pos.y = e.clientY; });
    (function cursorLoop() {
      ringPos.x += (pos.x - ringPos.x) * .16;
      ringPos.y += (pos.y - ringPos.y) * .16;
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%,-50%)`;
      label.style.transform = `translate(${ringPos.x}px, ${ringPos.y + 36}px) translate(-50%,-50%)`;
      requestAnimationFrame(cursorLoop);
    })();

    const interactive = "a, button, select, input, textarea, [role='button']";
    document.addEventListener("pointerover", (e) => {
      if (e.target.closest(interactive)) document.body.classList.add("cursor-on");
      const labeled = e.target.closest("[data-cursor-label]");
      if (labeled) {
        label.textContent = labeled.getAttribute("data-cursor-label");
        document.body.classList.add("cursor-label-on");
      }
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest(interactive)) document.body.classList.remove("cursor-on");
      if (e.target.closest("[data-cursor-label]")) document.body.classList.remove("cursor-label-on");
    });

    // brilho quente que segue o cursor nas seções escuras
    document.querySelectorAll(".chapter-dark, .insta").forEach((sec) => {
      sec.addEventListener("pointermove", (e) => {
        const r = sec.getBoundingClientRect();
        sec.style.setProperty("--mx", (e.clientX - r.left) + "px");
        sec.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });

    // tilt 3D nos elementos marcados
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -8;
        const ry = ((e.clientX - r.left) / r.width - .5) * 10;
        el.style.transition = "none";
        el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .6s cubic-bezier(.22,.8,.24,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });

    // letras que dançam no hover (rodapé e link do Instagram)
    document.querySelectorAll(".footer-mark, .insta-link").forEach((el) => {
      el.classList.add("wave");
      let i = 0;
      (function split(node) {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === 3 && child.textContent.trim()) {
            const frag = document.createDocumentFragment();
            [...child.textContent].forEach((ch) => {
              if (ch.trim()) {
                const s = document.createElement("span");
                s.textContent = ch; s.style.setProperty("--i", i++);
                frag.appendChild(s);
              } else frag.appendChild(document.createTextNode(ch));
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName === "EM") split(child);
          // (o <span> do rodapé — "odontologia" em mono — fica de fora de propósito)
        });
      })(el);
    });

    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 14;
      // anula qualquer transition de transform herdada (ex.: .reveal) durante o hover
      el.addEventListener("pointerenter", () => { el.style.transition = "none"; });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength * .7}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .5s cubic-bezier(.22,.8,.24,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ============================================================
     4. REVEALS
     ============================================================ */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    let stagger = 0;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const delay = (stagger++ % 4) * 90;
        setTimeout(() => en.target.classList.add("in"), delay);
        io.unobserve(en.target);
      }
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* ============================================================
     5. ACORDEÕES — especialidades e FAQ (mesmo padrão)
     ============================================================ */
  function accordion(headSel, itemSel) {
    document.querySelectorAll(headSel).forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(itemSel);
        const open = item.classList.contains("open");
        item.parentElement.querySelectorAll(itemSel + ".open").forEach((o) => {
          o.classList.remove("open");
          o.querySelector(headSel).setAttribute("aria-expanded", "false");
        });
        if (!open) { item.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });
  }
  accordion(".svc-head", ".svc");
  accordion(".faq-head", ".faq");

  /* ============================================================
     6. CARROSSEL DE AVALIAÇÕES — arraste, setas, bolinhas, autoplay
     ============================================================ */
  const car = document.querySelector(".car");
  if (car) {
    const viewport = car.querySelector(".car-viewport");
    const track = car.querySelector(".car-track");
    const slides = [...car.querySelectorAll(".car-slide")];
    const dotsBox = car.querySelector(".car-dots");
    let index = 0, timer = null;

    // semântica: slides identificados + viewport como carrossel
    viewport.setAttribute("aria-roledescription", "carrossel de depoimentos");
    viewport.setAttribute("aria-live", "off");
    slides.forEach((s, i) => {
      s.id = "car-slide-" + (i + 1);
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "depoimento");
      s.setAttribute("aria-label", (i + 1) + " de " + slides.length);
    });

    slides.forEach((_, i) => {
      const d = document.createElement("button");
      d.className = "car-dot"; d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "Depoimento " + (i + 1));
      d.setAttribute("aria-controls", "car-slide-" + (i + 1));
      d.addEventListener("click", () => { go(i); restart(); });
      dotsBox.appendChild(d);
    });
    const dots = [...dotsBox.children];

    function go(i, animate = true) {
      index = (i + slides.length) % slides.length;
      track.style.transition = animate && !reduceMotion ? "transform .6s cubic-bezier(.22,.8,.24,1)" : "none";
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d, k) => {
        d.classList.toggle("is-on", k === index);
        d.setAttribute("aria-selected", String(k === index));
      });
      slides.forEach((s, k) => s.setAttribute("aria-hidden", String(k !== index)));
    }
    function pause() {
      clearInterval(timer);
      viewport.setAttribute("aria-live", "polite");   // parado: anunciar trocas
    }
    function restart() {
      if (reduceMotion) return;
      clearInterval(timer);
      viewport.setAttribute("aria-live", "off");      // autoplay: não tagarelar no leitor
      timer = setInterval(() => go(index + 1), 6500);
    }

    car.querySelector(".car-prev").addEventListener("click", () => { go(index - 1); restart(); });
    car.querySelector(".car-next").addEventListener("click", () => { go(index + 1); restart(); });
    car.addEventListener("pointerenter", pause);
    car.addEventListener("pointerleave", restart);
    car.addEventListener("focusin", pause);
    car.addEventListener("focusout", restart);
    car.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { go(index - 1); restart(); }
      if (e.key === "ArrowRight") { go(index + 1); restart(); }
    });

    // arraste (pointer events; touch-action: pan-y no CSS)
    let dragging = false, startX = 0, dxPct = 0;
    viewport.addEventListener("pointerdown", (e) => {
      dragging = true; startX = e.clientX; dxPct = 0;
      track.style.transition = "none";
      viewport.setPointerCapture(e.pointerId);
      pause();
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dxPct = (e.clientX - startX) / viewport.clientWidth * 100;
      // resistência nas bordas
      if ((index === 0 && dxPct > 0) || (index === slides.length - 1 && dxPct < 0)) dxPct *= .35;
      track.style.transform = `translateX(${-index * 100 + dxPct}%)`;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (dxPct < -15) go(index + 1);
      else if (dxPct > 15) go(index - 1);
      else go(index);
      restart();
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    // links/imagens não devem "arrastar nativo"
    viewport.addEventListener("dragstart", (e) => e.preventDefault());

    go(0, false);
    restart();
  }

  /* ============================================================
     7. WIZARD DE AGENDAMENTO — 3 passos → WhatsApp
     ============================================================ */
  const wizard = document.getElementById("wizard");
  if (wizard) {
    const steps = [...wizard.querySelectorAll(".wiz-step")];
    const labels = [...wizard.querySelectorAll(".wiz-step-label")];
    const fill = wizard.querySelector(".wiz-bar-fill");
    const back = wizard.querySelector(".wiz-back");
    const next = wizard.querySelector(".wiz-next");
    const send = wizard.querySelector(".wiz-send");
    const err = document.getElementById("wiz-error");
    let step = 1;
    const choice = { servico: "Avaliação geral", periodo: "Qualquer horário" };

    // chips: seleção única por grupo (padrão radiogroup: role, aria-checked,
    // roving tabindex e navegação por setas)
    wizard.querySelectorAll(".chips").forEach((group) => {
      const key = group.closest("[data-step]").dataset.step === "1" ? "servico" : "periodo";
      const chips = [...group.querySelectorAll(".chip")];
      const sync = () => chips.forEach((c) => {
        const on = c.classList.contains("is-on");
        c.setAttribute("role", "radio");
        c.setAttribute("aria-checked", String(on));
        c.tabIndex = on ? 0 : -1;
      });
      const select = (chip) => {
        chips.forEach((c) => c.classList.remove("is-on"));
        chip.classList.add("is-on");
        choice[key] = chip.dataset.value;
        sync();
      };
      chips.forEach((chip, i) => {
        chip.addEventListener("click", () => select(chip));
        chip.addEventListener("keydown", (e) => {
          let j = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % chips.length;
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + chips.length) % chips.length;
          if (j !== null) { e.preventDefault(); select(chips[j]); chips[j].focus(); }
        });
      });
      sync();
    });

    function show(n) {
      step = n;
      steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
      labels.forEach((l) => l.classList.toggle("is-on", Number(l.dataset.stepLabel) <= n));
      fill.style.width = (n / steps.length * 100) + "%";
      back.hidden = n === 1;
      next.hidden = n === steps.length;
      send.hidden = n !== steps.length;
      err.hidden = true;
    }

    next.addEventListener("click", () => {
      if (step === 2) {
        const nome = wizard.querySelector("#w-nome").value.trim();
        const tel = wizard.querySelector("#w-tel").value.trim();
        if (!nome || !tel) { err.hidden = false; return; }
      }
      show(step + 1);
    });
    back.addEventListener("click", () => show(step - 1));

    wizard.addEventListener("submit", (e) => {
      e.preventDefault();
      // Enter antes do último passo age como "Continuar", nunca envia direto
      if (step < steps.length) { next.click(); return; }
      const nome = wizard.querySelector("#w-nome").value.trim();
      const tel = wizard.querySelector("#w-tel").value.trim();
      if (!nome || !tel) { show(2); err.hidden = false; return; }
      const msg = wizard.querySelector("#w-msg").value.trim();
      const texto =
        "Olá! Vim pelo site da Kamiguchi Odontologia e quero agendar uma consulta.\n" +
        `Serviço: ${choice.servico}\n` +
        `Nome: ${nome}\n` +
        `Telefone: ${tel}\n` +
        `Período preferido: ${choice.periodo}` +
        (msg ? `\nMensagem: ${msg}` : "");
      window.open("https://wa.me/5512997552370?text=" + encodeURIComponent(texto), "_blank", "noopener");
    });

    show(1);
  }

  /* ============================================================
     8. HEADER + MENU MOBILE
     ============================================================ */
  // trilho único de scroll (rAF): progresso, header, parallax do hero, scrub do ghost
  const header = document.querySelector(".header");
  const progBar = document.querySelector(".scroll-progress i");
  const heroInner = document.querySelector(".hero-inner");
  const ghost = document.querySelector(".inv-ghost");
  const invSec = document.getElementById("invisivel");
  let lastY = scrollY, ticking = false;

  function scrollRail() {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progBar) progBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle("scrolled", y > 40);
    // header se recolhe descendo, volta subindo (nunca com o menu aberto)
    if (!header.classList.contains("menu-open")) {
      if (y > 380 && y > lastY + 4) header.classList.add("tucked");
      else if (y < lastY - 4 || y <= 380) header.classList.remove("tucked");
    }
    lastY = y;
    if (!reduceMotion) {
      if (heroInner && y < innerHeight * 1.2) {
        const p = Math.min(1, y / innerHeight);
        heroInner.style.transform = `translateY(${p * 70}px)`;
        heroInner.style.opacity = String(1 - p * .9);
      }
      if (ghost && invSec) {
        const r = invSec.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight)));
        ghost.style.transform = `translateX(${(0.5 - p) * 18}%)`;
      }
    }
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(scrollRail); }
  }, { passive: true });
  scrollRail();

  const menuBtn = document.querySelector(".menu-btn");
  const overlay = document.querySelector(".menu-overlay");
  function setMenu(open) {
    // ao fechar, devolve o foco ao botão ANTES de esconder o overlay
    if (!open && overlay.contains(document.activeElement)) menuBtn.focus();
    overlay.classList.toggle("open", open);
    overlay.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    header.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      const first = overlay.querySelector("a");
      if (first) requestAnimationFrame(() => first.focus());
    }
  }
  menuBtn.addEventListener("click", () => setMenu(!overlay.classList.contains("open")));
  overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  // prende o Tab dentro do menu enquanto ele está aberto
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !overlay.classList.contains("open")) return;
    const items = [...overlay.querySelectorAll("a")];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
