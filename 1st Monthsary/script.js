(() => {
  const canvas = document.getElementById('canvas');
  const app = document.getElementById('app');
  const hudTime = document.querySelector('.hud__time');
  const ctx = canvas.getContext('2d', { alpha: true });

  let W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, 2);
  let started = false, startTime = 0;
  let cam = { parX: 0, parY: 0, baseY: 0, zoom: 1, targetZoom: 1, shake: 0 };

  const hearts = [], starsNear = [], starsFar = [], petals = [], sparks = [];
  const bokeh = [], fireflies = [], rays = [], dust = [], trails = [];
  const shootingStars = [];

  const rand = (a, b) => Math.random() * (b - a) + a;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function resize() {
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  function heartPath(x, y, s, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.32);
    ctx.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.62, -s * 0.82, 0, -s * 0.36);
    ctx.bezierCurveTo(s * 0.62, -s * 0.82, s * 0.9, -s * 0.25, 0, s * 0.32);
    ctx.closePath();
    ctx.restore();
  }

  function initParticles() {
    for (let i = 0; i < 180; i++) {
      starsFar.push({
        x: Math.random(), y: Math.random() * 0.85,
        r: rand(0.2, 0.9), a: rand(0.08, 0.45), p: rand(0, Math.PI * 2),
        depth: rand(0.2, 0.5)
      });
    }
    for (let i = 0; i < 90; i++) {
      starsNear.push({
        x: Math.random(), y: Math.random() * 0.75,
        r: rand(0.5, 2.2), a: rand(0.2, 0.95), p: rand(0, Math.PI * 2),
        depth: rand(0.6, 1)
      });
    }

    for (let i = 0; i < 200; i++) {
      const t = (i / 199) * Math.PI * 2;
      const scale = 0.019;
      const hx = 16 * Math.pow(Math.sin(t), 3) * scale;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
      const jitter = rand(-0.85, 0.85);
      hearts.push({
        tx: 0.5 + hx + jitter * 0.0045,
        ty: 0.38 + hy + jitter * 0.004,
        s: rand(3.2, 8.5),
        delay: rand(1.2, 4.5),
        hue: rand(330, 360),
        phase: rand(0, Math.PI * 2),
        rot: rand(-0.6, 0.6),
        twinkle: rand(0.5, 1)
      });
    }

    for (let i = 0; i < 110; i++) {
      petals.push({
        x: Math.random(), y: rand(-0.05, 1.05), s: rand(2, 6),
        speed: rand(0.0001, 0.00038), drift: rand(0.00025, 0.0012),
        phase: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2),
        hue: rand(340, 360)
      });
    }

    for (let i = 0; i < 35; i++) {
      bokeh.push({
        x: rand(0, 1), y: rand(0.15, 0.9), r: rand(20, 90),
        a: rand(0.02, 0.07), drift: rand(0.00005, 0.00015),
        phase: rand(0, Math.PI * 2)
      });
    }

    for (let i = 0; i < 45; i++) {
      fireflies.push({
        x: rand(0.15, 0.85), y: rand(0.35, 0.88),
        phase: rand(0, Math.PI * 2), r: rand(1.5, 3.5)
      });
    }

    for (let i = 0; i < 80; i++) {
      dust.push({
        x: Math.random(), y: Math.random(),
        s: rand(0.3, 1.2), speed: rand(0.00004, 0.00012),
        phase: rand(0, Math.PI * 2)
      });
    }

    for (let i = 0; i < 7; i++) {
      rays.push({ angle: rand(-0.4, 0.4), width: rand(0.08, 0.18), a: rand(0.04, 0.09) });
    }
  }
  initParticles();

  function drawSky(t, elapsed) {
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.0004);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    g.addColorStop(0, `rgba(255,150,180,${0.14 + breathe * 0.04})`);
    g.addColorStop(0.35, 'rgba(80,20,45,0.12)');
    g.addColorStop(0.7, 'rgba(20,5,15,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const aurora = ctx.createLinearGradient(0, H * 0.2, W, H * 0.55);
    aurora.addColorStop(0, 'rgba(255,100,150,0)');
    aurora.addColorStop(0.5, `rgba(255,120,160,${0.03 + breathe * 0.02})`);
    aurora.addColorStop(1, 'rgba(180,80,200,0)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStarsLayer(list, t, parallax) {
    for (const s of list) {
      const tw = 0.45 + 0.55 * Math.sin(t * 0.0018 + s.p);
      const a = s.a * tw;
      const px = (s.x + parallax * 0.02 * s.depth) * W;
      const py = (s.y + parallax * 0.01 * s.depth) * H;
      ctx.fillStyle = `rgba(255,225,235,${a})`;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.4 && tw > 0.85) {
        ctx.strokeStyle = `rgba(255,200,220,${a * 0.35})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px - s.r * 3, py);
        ctx.lineTo(px + s.r * 3, py);
        ctx.moveTo(px, py - s.r * 3);
        ctx.lineTo(px, py + s.r * 3);
        ctx.stroke();
      }
    }
  }

  function drawMoonAndRays(t, progress) {
    const mx = W * 0.48, my = H * 0.34;
    const moonR = Math.min(W, H) * 0.11;
    const moonGlow = ctx.createRadialGradient(mx, my, moonR * 0.2, mx, my, moonR * 4.2);
    moonGlow.addColorStop(0, `rgba(255,220,235,${0.22 + progress * 0.12})`);
    moonGlow.addColorStop(0.35, 'rgba(255,130,170,0.08)');
    moonGlow.addColorStop(1, 'rgba(255,100,150,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(mx, my);
    for (const ray of rays) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.0005 + ray.angle * 10);
      ctx.save();
      ctx.rotate(ray.angle + Math.sin(t * 0.0002) * 0.05);
      const rg = ctx.createLinearGradient(0, -H, 0, H * 0.5);
      rg.addColorStop(0, `rgba(255,200,220,${ray.a * pulse * progress})`);
      rg.addColorStop(1, 'rgba(255,150,180,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(-W * ray.width, -H);
      ctx.lineTo(W * ray.width, -H);
      ctx.lineTo(W * ray.width * 0.3, H * 0.5);
      ctx.lineTo(-W * ray.width * 0.3, H * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = `rgba(255,245,250,${0.35 + progress * 0.25})`;
    ctx.shadowColor = 'rgba(255,150,190,0.8)';
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawBokeh(t) {
    for (const b of bokeh) {
      b.x += Math.sin(t * 0.0003 + b.phase) * b.drift;
      const x = b.x * W, y = b.y * H;
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.001 + b.phase);
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, `rgba(255,150,180,${b.a * pulse})`);
      g.addColorStop(0.5, `rgba(255,100,140,${b.a * 0.4 * pulse})`);
      g.addColorStop(1, 'rgba(255,100,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDust(t) {
    for (const d of dust) {
      d.y -= d.speed;
      if (d.y < 0) { d.y = 1; d.x = Math.random(); }
      const x = (d.x + Math.sin(t * 0.0008 + d.phase) * 0.02) * W;
      const y = d.y * H;
      ctx.fillStyle = `rgba(255,210,225,${0.15 + 0.1 * Math.sin(t * 0.002 + d.phase)})`;
      ctx.fillRect(x, y, d.s, d.s);
    }
  }

  function drawGround() {
    const y = H * 0.82;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, 'rgba(12,3,8,0)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, H - y);

    const mist = ctx.createRadialGradient(W * 0.5, H * 0.95, 0, W * 0.5, H * 0.95, W * 0.6);
    mist.addColorStop(0, 'rgba(255,140,170,0.06)');
    mist.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
  }

  function drawTree(progress, t) {
    const cx = W * 0.56;
    const baseY = H * 0.91;
    const trunkH = H * 0.48 * easeOutExpo(progress);
    if (trunkH <= 2) return;

    const sway = Math.sin(t * 0.0008) * 3 * progress;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const grad = ctx.createLinearGradient(cx - 20, baseY, cx + 30, baseY - trunkH);
    grad.addColorStop(0, '#0f0508');
    grad.addColorStop(0.4, '#4a1f28');
    grad.addColorStop(1, '#a85568');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(10, W * 0.02);
    ctx.shadowColor = 'rgba(255,100,130,0.25)';
    ctx.shadowBlur = 18 * progress;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx - 12 + sway, baseY - trunkH * 0.5, cx + sway * 0.5, baseY - trunkH);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const branchProg = easeOut(clamp((progress - 0.28) / 0.72, 0, 1));
    const branchYs = [0.32, 0.42, 0.52, 0.62, 0.72, 0.8];
    for (let i = 0; i < branchYs.length; i++) {
      const by = baseY - trunkH * branchYs[i];
      const side = i % 2 ? -1 : 1;
      const len = branchProg * W * (0.11 + (i % 3) * 0.03);
      ctx.lineWidth = Math.max(3, W * 0.008 * (1 - i * 0.08));
      ctx.strokeStyle = `rgba(101,49,60,${0.5 + branchProg * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(cx + sway * 0.3, by);
      ctx.quadraticCurveTo(
        cx + side * len * 0.4, by - W * 0.02,
        cx + side * len, by - W * 0.035
      );
      ctx.stroke();
    }
    ctx.restore();

    const rootGlow = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, W * 0.15);
    rootGlow.addColorStop(0, `rgba(255,120,160,${0.15 * progress})`);
    rootGlow.addColorStop(1, 'rgba(255,100,150,0)');
    ctx.fillStyle = rootGlow;
    ctx.fillRect(cx - W * 0.2, baseY - 20, W * 0.4, 40);
  }

  function drawHearts(t, progress) {
    const appear = clamp((progress - 0.35) / 0.65, 0, 1);
    for (const h of hearts) {
      const local = clamp(appear * 1.5 - h.delay / 4.5, 0, 1);
      const p = easeOutExpo(local);
      const x = lerp(W * 0.5, h.tx * W, p);
      const y = lerp(H * 0.58, h.ty * H, p);
      const bob = Math.sin(t * 0.0014 + h.phase) * 3;
      const s = h.s * (0.35 + 0.65 * p);
      const tw = 0.85 + 0.15 * Math.sin(t * 0.003 * h.twinkle + h.phase);

      if (p > 0.05 && p < 0.98 && Math.random() < 0.018) {
        trails.push({ x, y: y + bob, life: 1, s: s * 0.4, hue: h.hue });
      }

      const glow = ctx.createRadialGradient(x, y + bob, 0, x, y + bob, s * 6);
      glow.addColorStop(0, `hsla(${h.hue},95%,72%,${0.14 * p * tw})`);
      glow.addColorStop(1, 'rgba(255,100,150,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y + bob, s * 6, 0, Math.PI * 2);
      ctx.fill();

      heartPath(x, y + bob, s, h.rot + Math.sin(t * 0.0009 + h.phase) * 0.06);
      ctx.fillStyle = `hsla(${h.hue},88%,${62 + 22 * p}%,${0.85 * p * tw})`;
      ctx.shadowColor = `hsla(${h.hue},100%,70%,0.55)`;
      ctx.shadowBlur = 14 * p;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawTrails() {
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      tr.life -= 0.035;
      tr.y -= 0.8;
      if (tr.life <= 0) { trails.splice(i, 1); continue; }
      heartPath(tr.x, tr.y, tr.s * tr.life, 0);
      ctx.fillStyle = `hsla(${tr.hue},90%,70%,${tr.life * 0.5})`;
      ctx.fill();
    }
  }

  function drawPetals(t) {
    for (const p of petals) {
      p.y -= p.speed;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      const x = (p.x + Math.sin(t * 0.00065 + p.phase) * p.drift * 50) * W;
      const y = p.y * H;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot + t * 0.00012);
      ctx.fillStyle = `hsla(${p.hue},80%,75%,0.32)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFireflies(t, progress) {
    if (progress < 0.2) return;
    for (const f of fireflies) {
      const glow = 0.3 + 0.7 * Math.pow(Math.sin(t * 0.0025 + f.phase) * 0.5 + 0.5, 2);
      const x = f.x * W + Math.sin(t * 0.0007 + f.phase) * 12;
      const y = f.y * H + Math.cos(t * 0.0006 + f.phase) * 8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, f.r * 8);
      g.addColorStop(0, `rgba(255,220,180,${0.5 * glow * progress})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, f.r * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function maybeShootingStar(t) {
    if (Math.random() > 0.0025 || !started) return;
    shootingStars.push({
      x: rand(0.1, 0.7), y: rand(0.05, 0.35),
      vx: rand(0.004, 0.009), vy: rand(0.002, 0.005),
      life: 1
    });
  }

  function drawShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.012;
      if (s.life <= 0) { shootingStars.splice(i, 1); continue; }
      const x = s.x * W, y = s.y * H;
      const g = ctx.createLinearGradient(x, y, x - 80, y - 40);
      g.addColorStop(0, `rgba(255,255,255,${s.life})`);
      g.addColorStop(1, 'rgba(255,180,200,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 80, y - 40);
      ctx.stroke();
    }
  }

  function burst(x, y, intensity = 1) {
    cam.shake = Math.min(12, cam.shake + 4 * intensity);
    for (let i = 0; i < 36 * intensity; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1.5, 5.5) * intensity;
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(0, 2),
        life: 1,
        s: rand(2, 6),
        rot: rand(0, 6.28),
        kind: Math.random() < 0.35 ? 'heart' : 'spark',
        hue: rand(330, 360)
      });
    }
  }

  function drawSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.028;
      s.vx *= 0.99;
      s.life -= 0.016;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      if (s.kind === 'heart') {
        heartPath(0, 0, s.s * s.life, s.rot);
        ctx.fillStyle = `hsla(${s.hue},90%,70%,${s.life})`;
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,200,220,${s.life})`;
        ctx.shadowColor = `rgba(255,150,180,${s.life})`;
        ctx.shadowBlur = 8;
        ctx.fillRect(-s.s / 2, -s.s / 2, s.s, s.s);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
  }

  function drawLensFlare(elapsed) {
    if (elapsed < 1.5) return;
    const a = Math.min(0.22, (elapsed - 1.5) / 4 * 0.22);
    const y = H * 0.42 + Math.sin(elapsed * 0.5) * 4;
    const g = ctx.createLinearGradient(0, y, W, y);
    g.addColorStop(0, 'rgba(255,130,170,0)');
    g.addColorStop(0.45, `rgba(255,210,225,${a})`);
    g.addColorStop(0.55, `rgba(255,255,255,${a * 0.6})`);
    g.addColorStop(1, 'rgba(255,130,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 1, W, 3);

    const orbs = [0.22, 0.38, 0.55, 0.68];
    for (const ox of orbs) {
      const oxp = W * ox;
      const og = ctx.createRadialGradient(oxp, y, 0, oxp, y, 25);
      og.addColorStop(0, `rgba(255,180,210,${a * 0.35})`);
      og.addColorStop(1, 'rgba(255,100,150,0)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(oxp, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function applyCamera(t) {
    cam.zoom = lerp(cam.zoom, cam.targetZoom, 0.04);
    if (cam.shake > 0) cam.shake *= 0.88;
    const sx = (Math.random() - 0.5) * cam.shake;
    const sy = (Math.random() - 0.5) * cam.shake;
    const parallax = started ? Math.sin(t * 0.0003) * 8 : 0;

    ctx.save();
    ctx.translate(W / 2 + cam.parX + sx, H / 2 + cam.baseY + cam.parY + sy + parallax * 0.3);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-W / 2, -H / 2);
  }

  function animate(t) {
    requestAnimationFrame(animate);

    const elapsed = started ? (t - startTime) / 1000 : 0;
    const treeProgress = started ? easeOutExpo(Math.min(1, elapsed / 4.2)) : 0;

    if (started) {
      cam.targetZoom = 1 + treeProgress * 0.04;
      cam.baseY = lerp(cam.baseY, -treeProgress * 14, 0.02);
    }

    ctx.clearRect(0, 0, W, H);
    applyCamera(t);

    const parallax = started ? elapsed * 0.5 : 0;
    drawSky(t, treeProgress);
    drawStarsLayer(starsFar, t, parallax * 0.5);
    drawDust(t);
    drawBokeh(t);
    drawMoonAndRays(t, started ? treeProgress : 0.3);
    drawStarsLayer(starsNear, t, parallax);
    drawGround();

    if (started) {
      drawTree(treeProgress, t);
      drawHearts(t, treeProgress);
      drawTrails();
      drawPetals(t);
      drawFireflies(t, treeProgress);
      maybeShootingStar(t);
      drawShootingStars();
      drawSparks();
      drawLensFlare(elapsed);
    }

    ctx.restore();

    if (hudTime && started) {
      const frames = Math.floor(elapsed * 24) % 24;
      const secs = Math.floor(elapsed) % 60;
      const mins = Math.floor(elapsed / 60) % 60;
      const hrs = Math.floor(elapsed / 3600);
      hudTime.textContent =
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    }
  }
  requestAnimationFrame(animate);

  const intro = document.getElementById('intro');
  const enter = document.getElementById('enter');
  const top = document.getElementById('top');
  const title = document.getElementById('title');
  const message = document.getElementById('message');
  const messageText = document.getElementById('messageText');
  const dock = document.getElementById('dock');
  const surprise = document.getElementById('surprise');
  const btnGallery = document.getElementById('btnGallery');
  const btnMusic = document.getElementById('btnMusic');
  const card = document.getElementById('card');
  const closeBtn = document.getElementById('close');
  const screenGallery = document.getElementById('screenGallery');
  const screenMusic = document.getElementById('screenMusic');
  const galleryTrack = document.getElementById('galleryTrack');
  const galCaption = document.getElementById('galCaption');
  const galCounter = document.getElementById('galCounter');
  const galPrev = document.getElementById('galPrev');
  const galNext = document.getElementById('galNext');
  const song = document.getElementById('song');
  const bgm = document.getElementById('bgm');
  const playPause = document.getElementById('playPause');
  const vinylDisc = document.getElementById('vinylDisc');
  const albumArt = document.getElementById('albumArt');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const progressFill = document.getElementById('progressFill');
  const progressGlow = document.getElementById('progressGlow');
  const progressBar = document.getElementById('progressBar');
  const timeCur = document.getElementById('timeCur');
  const timeDur = document.getElementById('timeDur');
  const musicHint = document.getElementById('musicHint');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const lyricLine = document.getElementById('lyricLine');
  const vizCanvas = document.getElementById('vizCanvas');
  const vizCtx = vizCanvas.getContext('2d');

  const fullMessage = messageText.textContent;

  /** Edit your photos (add 1.jpg, 2.jpg… in /images) and captions here */
  const GALLERY = [
    { jpg: 'images/1.jpg', fallback: 'images/1.svg', caption: 'Us on the Jeep — two hearts, one night drive.' },
    { jpg: 'images/2.jpg', fallback: 'images/2.svg', caption: 'Matching orange, matching energy. Just us on the couch.' },
    { jpg: 'images/3.jpg', fallback: 'images/3.svg', caption: 'Green jerseys and that look that says we belong together.' },
    { jpg: 'images/4.jpg', fallback: 'images/4.svg', caption: 'Side by side. My favorite person, my favorite chapter.' }
  ];

  const BG_VOL = 0.36;
  let bgmEnabled = false;
  let bgmFadeTimer = 0;
  let bgmFadeGen = 0;

  function fadeVolume(el, target, ms, onDone) {
    const gen = ++bgmFadeGen;
    clearInterval(bgmFadeTimer);
    const start = el.volume;
    const t0 = performance.now();
    bgmFadeTimer = setInterval(() => {
      if (gen !== bgmFadeGen) {
        clearInterval(bgmFadeTimer);
        return;
      }
      const p = Math.min(1, (performance.now() - t0) / ms);
      el.volume = clamp(start + (target - start) * p, 0, 1);
      if (p >= 1) {
        clearInterval(bgmFadeTimer);
        el.volume = target;
        if (onDone && gen === bgmFadeGen) onDone();
      }
    }, 30);
  }

  async function startBgm() {
    bgmEnabled = true;
    if (!bgm || !song.paused) return;
    bgm.muted = false;
    bgm.loop = true;
    bgm.volume = 0;
    try {
      await bgm.play();
      fadeVolume(bgm, BG_VOL, 1200);
    } catch (_) {}
  }

  function pauseBgm() {
    if (!bgm) return;
    fadeVolume(bgm, 0, 350, () => {
      bgm.pause();
    });
  }

  async function resumeBgm() {
    if (!bgmEnabled || !bgm) return;
    if (!song.paused) return;
    bgm.muted = false;
    try {
      if (bgm.paused) await bgm.play();
      fadeVolume(bgm, BG_VOL, 900);
    } catch (_) {}
  }

  /** Edit song file, title, and artist */
  const MUSIC = {
    src: 'song/at-my-worst.mp3',
    title: 'At My Worst',
    artist: 'Pink Sweat$  •  For my Mahal',
    artJpg: 'images/album.jpg',
    artFallback: 'images/album.svg'
  };

  const SONG_LINES = [
    'Can I be your favorite?',
    'Can I be your everything?',
    'Even at my worst…',
    'I want you to know I’ll never let you go.'
  ];

  function cameraShakeUI() {
    app.classList.remove('shake');
    void app.offsetWidth;
    app.classList.add('shake');
    setTimeout(() => app.classList.remove('shake'), 600);
  }

  function typewriter(el, text, speed = 28) {
    el.textContent = '';
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, speed);
      }
    };
    tick();
  }

  function playCinematicScore() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const master = ac.createGain();
      master.gain.value = 0.08;
      master.connect(ac.destination);

      const chords = [
        [261.63, 329.63, 392.0],
        [293.66, 369.99, 440.0],
        [329.63, 415.30, 493.88],
        [261.63, 329.63, 392.0]
      ];

      chords.forEach((chord, ci) => {
        chord.forEach((freq, ni) => {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = ni === 0 ? 'sine' : 'triangle';
          o.frequency.value = freq;
          const start = ac.currentTime + ci * 1.1 + ni * 0.05;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.04 / (ni + 1), start + 0.08);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
          o.connect(g);
          g.connect(master);
          o.start(start);
          o.stop(start + 1.5);
        });
      });

      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        const start = ac.currentTime + 3.5 + i * 0.22;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.035, start + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(start);
        o.stop(start + 1);
      });
    } catch (_) {}
  }

  enter.addEventListener('click', () => {
    if (started) return;
    started = true;
    startTime = performance.now();

    app.classList.add('playing', 'zoom-in');
    intro.classList.add('hide');

    setTimeout(() => {
      top.classList.add('show');
      burst(W * 0.56, H * 0.42, 1.2);
      cameraShakeUI();
    }, 700);

    setTimeout(() => title.classList.add('show'), 4200);
    setTimeout(() => {
      message.classList.add('show');
      typewriter(messageText, fullMessage, 22);
    }, 6800);
    setTimeout(() => dock.classList.add('show'), 8000);

    startBgm();
  });

  let activeOverlay = null;
  let galIndex = 0;
  let galAutoplay = null;
  let lyricTimer = null;
  let lyricIndex = 0;
  let vizRaf = 0;
  let audioCtx = null;
  let analyser = null;
  let audioLinked = false;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${pad2(s)}`;
  }

  function setDockActive(btn) {
    dock.querySelectorAll('.dockBtn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  function closeOverlays() {
    card.classList.remove('show');
    screenGallery.classList.remove('show');
    screenMusic.classList.remove('show');
    screenGallery.setAttribute('aria-hidden', 'true');
    screenMusic.setAttribute('aria-hidden', 'true');
    if (galAutoplay) { clearInterval(galAutoplay); galAutoplay = null; }
    if (lyricTimer) { clearInterval(lyricTimer); lyricTimer = null; }
    if (vizRaf) { cancelAnimationFrame(vizRaf); vizRaf = 0; }
    activeOverlay = null;
    setDockActive(null);
  }

  function openOverlay(kind) {
    closeOverlays();
    activeOverlay = kind;

    if (kind === 'letter') {
      card.classList.add('show');
      setDockActive(surprise);
      burst(W * 0.5, H * 0.5, 1.5);
      return;
    }

    if (kind === 'gallery') {
      screenGallery.classList.add('show');
      screenGallery.setAttribute('aria-hidden', 'false');
      setDockActive(btnGallery);
      showSlide(galIndex, false);
      galAutoplay = setInterval(() => stepGallery(1), 5500);
      return;
    }

    if (kind === 'music') {
      screenMusic.classList.add('show');
      screenMusic.setAttribute('aria-hidden', 'false');
      setDockActive(btnMusic);
      resizeViz();
      startVizLoop();
      startLyricCycle();
    }
  }

  function buildGallery() {
    galleryTrack.innerHTML = '';
    GALLERY.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'gallerySlide' + (i === 0 ? ' active' : '');
      const img = document.createElement('img');
      img.alt = item.caption || `Memory ${i + 1}`;
      img.src = item.jpg;
      img.addEventListener('error', () => { img.src = item.fallback; }, { once: true });
      slide.appendChild(img);
      galleryTrack.appendChild(slide);
    });
    updateGalleryUI();
  }

  function updateGalleryUI() {
    const total = GALLERY.length;
    galCaption.textContent = GALLERY[galIndex]?.caption || '';
    galCounter.textContent = `${pad2(galIndex + 1)} / ${pad2(total)}`;
    galleryTrack.querySelectorAll('.gallerySlide').forEach((el, i) => {
      el.classList.toggle('active', i === galIndex);
    });
  }

  function showSlide(index, animateBurst = true) {
    galIndex = (index + GALLERY.length) % GALLERY.length;
    updateGalleryUI();
    if (animateBurst) {
      const rect = galleryTrack.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.6);
    }
  }

  function stepGallery(dir) {
    showSlide(galIndex + dir);
  }

  function applyVolume(pct) {
    const vol = clamp(pct / 100, 0, 1);
    song.muted = false;
    song.volume = vol;
    if (volumeSlider) volumeSlider.value = String(Math.round(vol * 100));
    if (volumeValue) volumeValue.textContent = `${Math.round(vol * 100)}%`;
  }

  function initMusicMeta() {
    song.src = MUSIC.src;
    song.muted = false;
    applyVolume(100);
    trackTitle.textContent = MUSIC.title;
    trackArtist.textContent = MUSIC.artist;
    albumArt.src = MUSIC.artJpg;
    albumArt.addEventListener('error', () => { albumArt.src = MUSIC.artFallback; }, { once: true });
  }

  function startLyricCycle() {
    if (!lyricLine || !SONG_LINES.length) return;
    lyricIndex = 0;
    lyricLine.textContent = SONG_LINES[0];
    if (lyricTimer) clearInterval(lyricTimer);
    lyricTimer = setInterval(() => {
      lyricIndex = (lyricIndex + 1) % SONG_LINES.length;
      lyricLine.style.opacity = '0';
      lyricLine.style.transform = 'translateY(8px)';
      setTimeout(() => {
        lyricLine.textContent = SONG_LINES[lyricIndex];
        lyricLine.style.opacity = '1';
        lyricLine.style.transform = 'none';
      }, 280);
    }, 4200);
  }

  function linkAudioGraph() {
    // Keep playback on the audio element so local MP3s are not silenced
    // by Web Audio / CORS. The rings still animate from the playhead.
  }

  function resizeViz() {
    const box = vizCanvas.parentElement.getBoundingClientRect();
    const size = Math.max(box.width, box.height) * 1.24;
    vizCanvas.width = size * DPR;
    vizCanvas.height = size * DPR;
    vizCanvas.style.width = size + 'px';
    vizCanvas.style.height = size + 'px';
    vizCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawVisualizer() {
    vizRaf = requestAnimationFrame(drawVisualizer);
    if (!screenMusic.classList.contains('show')) return;

    const w = vizCanvas.width / DPR;
    const h = vizCanvas.height / DPR;
    vizCtx.clearRect(0, 0, w, h);

    const t = performance.now() * 0.001;
    const playing = !song.paused;
    const beat = playing ? 0.45 + 0.55 * Math.abs(Math.sin(t * 4.2)) : 0.2;
    const cx = w / 2, cy = h / 2;
    const bars = 64;
    for (let i = 0; i < bars; i++) {
      const pulse = beat * (0.55 + 0.45 * Math.abs(Math.sin(t * 2 + i * 0.4)));
      const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const inner = w * 0.18;
      const outer = inner + pulse * w * 0.18;
      vizCtx.strokeStyle = `rgba(255,${120 + pulse * 80},${160 + pulse * 40},${0.25 + pulse * 0.5})`;
      vizCtx.lineWidth = 3;
      vizCtx.beginPath();
      vizCtx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      vizCtx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      vizCtx.stroke();
    }
  }

  function startVizLoop() {
    if (vizRaf) cancelAnimationFrame(vizRaf);
    drawVisualizer();
  }

  async function togglePlay() {
    song.muted = false;
    if (song.volume < 0.2) applyVolume(100);

    if (song.paused) {
      try {
        pauseBgm();
        await song.play();
        playPause.textContent = '❚❚ PAUSE';
        playPause.classList.add('isPlaying');
        vinylDisc.classList.add('playing');
        musicHint.textContent = 'Playing At My Worst — background music will return when this ends.';
        musicHint.style.opacity = '0.85';
      } catch (err) {
        musicHint.textContent = 'Could not play the song. Refresh, then tap play again.';
        musicHint.style.color = '#ffb8cc';
        resumeBgm();
      }
    } else {
      song.pause();
      playPause.textContent = '▶ PLAY OUR SONG';
      playPause.classList.remove('isPlaying');
      vinylDisc.classList.remove('playing');
      resumeBgm();
    }
  }

  function updateProgress() {
    const cur = song.currentTime || 0;
    const dur = song.duration || 0;
    const pct = dur ? (cur / dur) * 100 : 0;
    progressFill.style.width = pct + '%';
    progressGlow.style.left = pct + '%';
    progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
    timeCur.textContent = formatTime(cur);
    timeDur.textContent = formatTime(dur);
  }

  buildGallery();
  initMusicMeta();

  surprise.addEventListener('click', () => openOverlay('letter'));
  btnGallery.addEventListener('click', () => openOverlay('gallery'));
  btnMusic.addEventListener('click', () => openOverlay('music'));
  closeBtn.addEventListener('click', () => closeOverlays());

  document.querySelectorAll('[data-close-screen]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlays());
  });

  galPrev.addEventListener('click', () => stepGallery(-1));
  galNext.addEventListener('click', () => stepGallery(1));

  playPause.addEventListener('click', () => togglePlay());
  volumeSlider.addEventListener('input', () => applyVolume(Number(volumeSlider.value)));
  song.addEventListener('timeupdate', updateProgress);
  song.addEventListener('loadedmetadata', updateProgress);
  song.addEventListener('error', () => {
    musicHint.textContent = 'Could not load At My Worst from the song folder.';
    musicHint.style.color = '#ffb8cc';
  });
  song.addEventListener('ended', () => {
    playPause.textContent = '▶ PLAY OUR SONG';
    playPause.classList.remove('isPlaying');
    vinylDisc.classList.remove('playing');
    resumeBgm();
  });
  song.addEventListener('pause', () => {
    if (song.ended) return;
    if (!playPause.classList.contains('isPlaying')) resumeBgm();
  });

  progressBar.addEventListener('click', e => {
    if (!song.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    song.currentTime = ratio * song.duration;
  });

  addEventListener('keydown', e => {
    if (!screenGallery.classList.contains('show')) return;
    if (e.key === 'ArrowRight') stepGallery(1);
    if (e.key === 'ArrowLeft') stepGallery(-1);
    if (e.key === 'Escape') closeOverlays();
  });

  addEventListener('pointerdown', e => {
    if (!started || e.target.closest('button')) return;
    if (card.classList.contains('show') || screenGallery.classList.contains('show') || screenMusic.classList.contains('show')) return;
    burst(e.clientX, e.clientY, 0.7);
  });

  addEventListener('pointermove', e => {
    if (!started) return;
    const nx = (e.clientX / W - 0.5) * 2;
    const ny = (e.clientY / H - 0.5) * 2;
    cam.parX = nx * 8;
    cam.parY = ny * 5;
  }, { passive: true });
})();
