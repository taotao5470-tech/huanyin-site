// ============ HERO CANVAS ANIMATION (Enhanced) ============
(function() {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, particles, mouse = {x: -9999, y: -9999};
  var isMobile = false;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    isMobile = W < 768;
    var area = W * H;
    var density = isMobile ? 0.00020 : 0.00012;
    var count = Math.floor(area * density);
    if (!particles || particles.length !== count) {
      particles = [];
      for (var i = 0; i < count; i++) particles.push(new Particle());
    }
  }

  var TYPES = ['dot', 'diamond', 'glow', 'ring'];
  var COLORS = [
    { r: 47, g: 208, b: 139 },
    { r: 255, g: 184, b: 77 },
    { r: 100, g: 180, b: 220 },
    { r: 200, g: 225, b: 240 },
  ];

  function Particle() {
    this.type = TYPES[Math.floor(Math.random() * TYPES.length)];
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.reset();
  }
  Particle.prototype.reset = function() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.baseR = this.type === 'glow' ? Math.random() * 3 + 2
      : this.type === 'ring' ? Math.random() * 2.5 + 1.5
      : this.type === 'diamond' ? Math.random() * 2 + 1
      : Math.random() * 2 + 0.6;
    this.r = this.baseR;
    this.vx = (Math.random() - 0.5) * (this.type === 'glow' ? 0.2 : 0.45);
    this.vy = (Math.random() - 0.5) * (this.type === 'glow' ? 0.2 : 0.45);
    this.alpha = this.type === 'glow' ? Math.random() * 0.35 + 0.1
      : this.type === 'ring' ? Math.random() * 0.3 + 0.08
      : Math.random() * 0.5 + 0.2;
    this.pulse = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.02 + 0.005;
  };

  function drawParticle(p) {
    var c = p.color, a = p.alpha, x = p.x, y = p.y, r = p.r;
    ctx.beginPath();
    switch (p.type) {
      case 'diamond':
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 0.7, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r * 0.7, y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
        ctx.fill();
        break;
      case 'glow':
        var g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
        g.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')');
        g.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
        ctx.fillStyle = g;
        ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ring':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a * 1.5) + ')';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        break;
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
        ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (mouse.x > -9990) {
      var grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280);
      grd.addColorStop(0, 'rgba(47,208,139,0.09)');
      grd.addColorStop(0.5, 'rgba(47,208,139,0.03)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    var connDist = isMobile ? 90 : 120;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var maxCheck = isMobile ? 6 : 14;
      var checked = 0;
      for (var j = i + 1; j < particles.length && checked < maxCheck; j++) {
        var q = particles[j];
        var dx = p.x - q.x, dy = p.y - q.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < connDist) {
          checked++;
          var lineAlpha = 0.06 * (1 - dist/connDist);
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + lineAlpha + ')';
          ctx.lineWidth = 0.4;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      var mdx = p.x - mouse.x, mdy = p.y - mouse.y;
      var mdist = Math.sqrt(mdx*mdx + mdy*mdy);
      var repelRange = isMobile ? 100 : 140;
      if (mdist < repelRange && mdist > 0) {
        var force = (repelRange - mdist) / repelRange * 0.5;
        p.vx += (mdx / mdist) * force;
        p.vy += (mdy / mdist) * force;
      }

      p.pulse += p.pulseSpeed;
      p.r = p.baseR + Math.sin(p.pulse) * p.baseR * 0.3;

      p.vx *= 0.975;
      p.vy *= 0.975;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -30) p.x = W + 30;
      if (p.x > W + 30) p.x = -30;
      if (p.y < -30) p.y = H + 30;
      if (p.y > H + 30) p.y = -30;

      drawParticle(p);
    }
    requestAnimationFrame(draw);
  }

  var hero = canvas.closest('.hero');

  hero.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  hero.addEventListener('touchmove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
  }, { passive: true });

  hero.addEventListener('touchstart', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
  }, { passive: true });

  hero.addEventListener('mouseleave', function() { mouse.x = -9999; mouse.y = -9999; });
  hero.addEventListener('touchend', function() { mouse.x = -9999; mouse.y = -9999; });

  window.addEventListener('resize', function() { resize(); });

  resize();
  draw();
})();
