/* ============================================================
   FURIOS-INT // SIGNAL_LAB EXTRA MODULES v1.0
   Advanced hacker-math visualizations:
     1. HYPERTORUS_4D    Clifford torus on S^3, 6-plane 4D
                         rotation, stereographic R4->R3, ortho R2.
     2. LORENZ_ATTRACTOR Strange attractor RK4 integration with
                         multi-particle ensemble + trail buffer.
     3. ECC_CURVE        Real & finite-field elliptic curve point
                         addition, geometric chord/tangent overlay.
     4. PRIME_SPIRAL     Sieve of Eratosthenes -> Ulam/Sacks/Vogel
                         spiral plot with twin-prime highlight.
     5. FLOW_FIELD       Hash-gradient pseudo-Perlin vector field
                         with persistent particle trails.
     6. CHAOS_IFS        Iterated Function Systems via chaos game
                         (Sierpinski, Barnsley, Heighway, Koch...).
   No deps. Strict CSP-safe. ES5-compatible.
   ============================================================ */
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function on(el, ev, fn){ if(el) el.addEventListener(ev, fn); }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function rand(a,b){ return a + Math.random()*(b-a); }

  /* =====================================================
     PALETTES (shared)
     ===================================================== */
  var PAL = {
    cyber:  function(t){ var r=Math.floor(255*Math.pow(t,2)); var g=Math.floor(232*(1-t)); var b=Math.floor(255*(0.4+0.6*t)); return 'rgb('+r+','+g+','+b+')'; },
    matrix: function(t){ var g=Math.floor(60+195*t); return 'rgb(0,'+g+',65)'; },
    plasma: function(t){ var r=Math.floor(255*t); var g=Math.floor(60+195*Math.sin(t*Math.PI)); var b=Math.floor(255*(1-t)); return 'rgb('+r+','+g+','+b+')'; },
    amber:  function(t){ var r=Math.floor(120+135*t); var g=Math.floor(80+120*t); return 'rgb('+r+','+g+',0)'; },
    rainbow:function(t){ var h=Math.floor(360*t); return 'hsl('+h+',100%,55%)'; }
  };

  /* =====================================================
     1. HYPERTORUS_4D
     ===================================================== */
  (function HYPERTORUS(){
    var c = $('htor-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var paused = false;

    var ctl = {
      xy: $('htor-xy'), zw: $('htor-zw'), xz: $('htor-xz'), yw: $('htor-yw'),
      res: $('htor-res'), pal: $('htor-pal'), pause: $('htor-pause'),
      out: $('htor-out')
    };
    function readv(el){ return parseInt(el.value,10) / 100; }
    function readint(el){ return parseInt(el.value,10); }
    function syncLabels(){
      $('htor-xy-v').textContent = readv(ctl.xy).toFixed(2);
      $('htor-zw-v').textContent = readv(ctl.zw).toFixed(2);
      $('htor-xz-v').textContent = readv(ctl.xz).toFixed(2);
      $('htor-yw-v').textContent = readv(ctl.yw).toFixed(2);
      $('htor-res-v').textContent = readint(ctl.res);
    }
    ['input','change'].forEach(function(ev){
      [ctl.xy,ctl.zw,ctl.xz,ctl.yw,ctl.res].forEach(function(el){ on(el, ev, syncLabels); });
    });
    syncLabels();
    on(ctl.pause,'click',function(){ paused = !paused; ctl.pause.textContent = paused?'RESUME':'PAUSE'; });

    // 4D point: torus parameterization on S^3 (Clifford torus)
    function buildVerts(N){
      var v=[]; var INV=1/Math.sqrt(2);
      for(var i=0;i<N;i++){
        var th = (i/N)*Math.PI*2;
        for(var j=0;j<N;j++){
          var ph = (j/N)*Math.PI*2;
          v.push([INV*Math.cos(th), INV*Math.sin(th), INV*Math.cos(ph), INV*Math.sin(ph), i, j]);
        }
      }
      return v;
    }

    // 4D rotation in plane (i,j) by angle a, applied to vector v[4]
    function rot4(v, i, j, a){
      var ca=Math.cos(a), sa=Math.sin(a);
      var vi=v[i], vj=v[j];
      v[i] = ca*vi - sa*vj;
      v[j] = sa*vi + ca*vj;
    }

    // Stereographic projection R^4 -> R^3 (project from north pole w=1)
    function stereo3(v){
      var d = 1 - v[3];
      if(Math.abs(d) < 1e-6) d = 1e-6;
      return [v[0]/d, v[1]/d, v[2]/d];
    }

    var t0 = performance.now();
    var verts = buildVerts(readint(ctl.res));
    var lastRes = readint(ctl.res);

    function frame(){
      var now = performance.now();
      var dt = (now - t0)/1000;
      if(readint(ctl.res) !== lastRes){
        lastRes = readint(ctl.res);
        verts = buildVerts(lastRes);
      }
      var axy = readv(ctl.xy)*dt;
      var azw = readv(ctl.zw)*dt;
      var axz = readv(ctl.xz)*dt;
      var ayw = readv(ctl.yw)*dt;
      var pal = PAL[ctl.pal.value] || PAL.cyber;

      ctx.fillStyle = 'rgba(2,4,8,0.20)';
      ctx.fillRect(0,0,W,H);

      var N = lastRes;
      // project all verts
      var proj = new Array(verts.length);
      for(var k=0;k<verts.length;k++){
        var p = verts[k].slice(0,4);
        rot4(p,0,1,axy);
        rot4(p,2,3,azw);
        rot4(p,0,2,axz);
        rot4(p,1,3,ayw);
        var s = stereo3(p);
        // perspective R3 -> R2
        var camz = 4 - s[2];
        if(camz < 0.5) camz = 0.5;
        var f = 220 / camz;
        proj[k] = {
          x: W/2 + s[0]*f,
          y: H/2 + s[1]*f,
          z: s[2],
          i: verts[k][4], j: verts[k][5]
        };
      }

      // Draw wireframe by linking i-neighbours and j-neighbours
      for(var idx=0; idx<proj.length; idx++){
        var i = proj[idx].i, j = proj[idx].j;
        var a = proj[idx];
        var bIdx = ((i+1)%N)*N + j;
        var cIdx = i*N + ((j+1)%N);
        if(bIdx < proj.length){
          var b = proj[bIdx];
          var depth = clamp((a.z + b.z)/4 + 0.5, 0, 1);
          ctx.strokeStyle = pal(depth);
          ctx.globalAlpha = 0.35 + 0.65*depth;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
        if(cIdx < proj.length){
          var d = proj[cIdx];
          var depth2 = clamp((a.z + d.z)/4 + 0.5, 0, 1);
          ctx.strokeStyle = pal(depth2);
          ctx.globalAlpha = 0.35 + 0.65*depth2;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(d.x,d.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      ctl.out.textContent = 'vertices: ' + proj.length + '  t: ' + dt.toFixed(1) + 's  res: '+N+'^2';

      if(!paused) requestAnimationFrame(frame);
      else setTimeout(function(){ if(paused) frame(); }, 200);
    }
    requestAnimationFrame(frame);
  })();

  /* =====================================================
     2. LORENZ_ATTRACTOR
     ===================================================== */
  (function LORENZ(){
    var c = $('lor-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;

    var ctl = {
      sigma: $('lor-sigma'), rho: $('lor-rho'), beta: $('lor-beta'),
      n: $('lor-n'), reset: $('lor-reset'), out: $('lor-out')
    };
    function syncLabels(){
      $('lor-sigma-v').textContent = ctl.sigma.value;
      $('lor-rho-v').textContent   = ctl.rho.value;
      $('lor-beta-v').textContent  = (parseInt(ctl.beta.value,10)/10).toFixed(2);
      $('lor-n-v').textContent     = ctl.n.value;
    }
    [ctl.sigma,ctl.rho,ctl.beta,ctl.n].forEach(function(el){ on(el,'input',syncLabels); });
    syncLabels();

    var COL = ['#00e8ff','#ff00ea','#00ff41','#ffe700','#ffa500','#ff4444','#9af','#fa7'];
    var particles = [];
    function reseed(){
      var n = parseInt(ctl.n.value,10);
      particles = [];
      for(var i=0;i<n;i++){
        particles.push({
          x: rand(-0.5,0.5)+0.01*i,
          y: rand(-0.5,0.5),
          z: rand(0.5,1.5),
          col: COL[i % COL.length]
        });
      }
      ctx.fillStyle = '#020408'; ctx.fillRect(0,0,W,H);
    }
    on(ctl.reset,'click', reseed);
    reseed();

    function step(p, sigma, rho, beta, h){
      // RK4
      function deriv(x,y,z){
        return [sigma*(y-x), x*(rho-z)-y, x*y - beta*z];
      }
      var k1 = deriv(p.x,p.y,p.z);
      var k2 = deriv(p.x+h/2*k1[0], p.y+h/2*k1[1], p.z+h/2*k1[2]);
      var k3 = deriv(p.x+h/2*k2[0], p.y+h/2*k2[1], p.z+h/2*k2[2]);
      var k4 = deriv(p.x+h*k3[0], p.y+h*k3[1], p.z+h*k3[2]);
      p.x += h/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]);
      p.y += h/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]);
      p.z += h/6*(k1[2]+2*k2[2]+2*k3[2]+k4[2]);
    }

    function frame(){
      var sigma = parseInt(ctl.sigma.value,10);
      var rho = parseInt(ctl.rho.value,10);
      var beta = parseInt(ctl.beta.value,10)/10;
      var h = 0.005;

      // dim trail
      ctx.fillStyle = 'rgba(2,4,8,0.06)';
      ctx.fillRect(0,0,W,H);

      var n = parseInt(ctl.n.value,10);
      while(particles.length < n) particles.push({x:rand(-0.5,0.5),y:rand(-0.5,0.5),z:rand(0.5,1.5),col:COL[particles.length%COL.length]});
      while(particles.length > n) particles.pop();

      for(var s=0;s<6;s++){
        for(var i=0;i<particles.length;i++){
          var p = particles[i];
          var px = p.x, py = p.y;
          step(p, sigma, rho, beta, h);
          // project (x,z) onto canvas; rotate slightly with y
          var sx = W/2 + (p.x*8 + p.y*1.5);
          var sy = H/2 + 60 - (p.z - 25)*7;
          var psx = W/2 + (px*8 + py*1.5);
          var psy = H/2 + 60 - (p.z - 25)*7;
          ctx.strokeStyle = p.col;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(psx,psy); ctx.lineTo(sx,sy); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      var p0 = particles[0];
      ctl.out.textContent = 'p0: x=' + p0.x.toFixed(2) + ' y=' + p0.y.toFixed(2) + ' z=' + p0.z.toFixed(2) + ' particles: ' + particles.length;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* =====================================================
     3. ECC_CURVE
     ===================================================== */
  (function ECC(){
    var c = $('ecc-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var ctl = {
      a: $('ecc-a'), b: $('ecc-b'), k: $('ecc-k'), mode: $('ecc-mode'),
      p: $('ecc-p'), redraw: $('ecc-redraw'), out: $('ecc-out')
    };
    function syncLabels(){
      $('ecc-a-v').textContent = ctl.a.value;
      $('ecc-b-v').textContent = ctl.b.value;
      $('ecc-k-v').textContent = ctl.k.value;
      $('ecc-p-v').textContent = ctl.p.value;
    }
    [ctl.a,ctl.b,ctl.k,ctl.p,ctl.mode].forEach(function(el){ on(el,'input',function(){ syncLabels(); draw(); }); on(el,'change',function(){ syncLabels(); draw(); }); });
    on(ctl.redraw,'click',draw);
    syncLabels();

    // modular helpers for finite field
    function modp(x,p){ x = x % p; if(x<0) x += p; return x; }
    function egcd(a,b){
      if(b===0) return [a,1,0];
      var r = egcd(b, a%b);
      return [r[0], r[2], r[1] - Math.floor(a/b)*r[2]];
    }
    function modinv(a,p){ var r = egcd(modp(a,p),p); if(r[0] !== 1) return null; return modp(r[1],p); }

    // Real point addition
    function ptAddReal(P,Q,a){
      if(!P) return Q; if(!Q) return P;
      if(P.x === Q.x && P.y === -Q.y) return null; // O
      var m;
      if(P.x === Q.x && P.y === Q.y){
        if(P.y === 0) return null;
        m = (3*P.x*P.x + a) / (2*P.y);
      } else {
        m = (Q.y - P.y) / (Q.x - P.x);
      }
      var rx = m*m - P.x - Q.x;
      var ry = m*(P.x - rx) - P.y;
      return {x:rx, y:ry};
    }

    // Finite point addition
    function ptAddFp(P,Q,a,p){
      if(!P) return Q; if(!Q) return P;
      if(P.x === Q.x && modp(P.y + Q.y, p) === 0) return null;
      var m;
      if(P.x === Q.x && P.y === Q.y){
        if(P.y === 0) return null;
        var inv = modinv(2*P.y, p); if(inv === null) return null;
        m = modp((3*P.x*P.x + a) * inv, p);
      } else {
        var inv2 = modinv(Q.x - P.x, p); if(inv2 === null) return null;
        m = modp((Q.y - P.y) * inv2, p);
      }
      var rx = modp(m*m - P.x - Q.x, p);
      var ry = modp(m*(P.x - rx) - P.y, p);
      return {x:rx, y:ry};
    }

    function draw(){
      ctx.fillStyle = '#020408'; ctx.fillRect(0,0,W,H);
      var a = parseInt(ctl.a.value,10);
      var b = parseInt(ctl.b.value,10);
      var k = parseInt(ctl.k.value,10);
      var mode = ctl.mode.value;
      var p = parseInt(ctl.p.value,10);

      // axes
      ctx.strokeStyle = '#1a2436';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();

      if(mode === 'real'){
        // plot y^2 = x^3 + ax + b
        var scale = 50;
        ctx.strokeStyle = '#00e8ff'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        var first = true;
        for(var px=-W/2; px<=W/2; px++){
          var x = px/scale;
          var yy = x*x*x + a*x + b;
          if(yy < 0){ first = true; continue; }
          var y = Math.sqrt(yy);
          var sx = W/2 + px;
          var sy1 = H/2 - y*scale;
          if(first){ ctx.moveTo(sx,sy1); first = false; } else ctx.lineTo(sx,sy1);
        }
        ctx.stroke();
        ctx.beginPath(); first = true;
        for(var px2=-W/2; px2<=W/2; px2++){
          var x2 = px2/scale;
          var yy2 = x2*x2*x2 + a*x2 + b;
          if(yy2 < 0){ first = true; continue; }
          var y2 = Math.sqrt(yy2);
          var sx2 = W/2 + px2;
          var sy2 = H/2 + y2*scale;
          if(first){ ctx.moveTo(sx2,sy2); first = false; } else ctx.lineTo(sx2,sy2);
        }
        ctx.stroke();

        // pick a base point P
        var Px = -0.6;
        for(var tx=-3; tx<3; tx+=0.05){
          var t2 = tx*tx*tx + a*tx + b;
          if(t2 > 0.01){ Px = tx; break; }
        }
        var P = {x:Px, y: Math.sqrt(Px*Px*Px + a*Px + b)};
        var pts = [P];
        var cur = P;
        for(var i=1;i<k;i++){
          var nxt = ptAddReal(cur,P,a);
          if(!nxt) break;
          pts.push(nxt);
          cur = nxt;
        }
        // draw chord-tangent connectors
        for(var j=0;j<pts.length;j++){
          var pp = pts[j];
          var sxp = W/2 + pp.x*scale;
          var syp = H/2 - pp.y*scale;
          ctx.fillStyle = j===0 ? '#ff00ea' : (j===pts.length-1 ? '#ffe700' : '#00ff41');
          ctx.beginPath(); ctx.arc(sxp,syp, j===0||j===pts.length-1?6:3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#7a8aa6';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText((j+1)+'P', sxp+8, syp-6);
        }
        ctl.out.textContent = 'mode: REAL  P=('+P.x.toFixed(3)+','+P.y.toFixed(3)+')  '+k+'P=('+(pts[pts.length-1]?pts[pts.length-1].x.toFixed(3):'O')+','+(pts[pts.length-1]?pts[pts.length-1].y.toFixed(3):'O')+')';
      } else {
        // finite field
        var pts2 = [];
        for(var xi=0; xi<p; xi++){
          var rhs = modp(xi*xi*xi + a*xi + b, p);
          for(var yi=0; yi<p; yi++){
            if(modp(yi*yi, p) === rhs) pts2.push({x:xi,y:yi});
          }
        }
        var sxs = W / (p+2), sys = H / (p+2);
        // grid
        ctx.strokeStyle = '#0e1626'; ctx.lineWidth = 0.5;
        for(var gx=0; gx<=p; gx++){
          ctx.beginPath(); ctx.moveTo(sxs+gx*sxs, sys); ctx.lineTo(sxs+gx*sxs, sys+p*sys); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sxs, sys+gx*sys); ctx.lineTo(sxs+p*sxs, sys+gx*sys); ctx.stroke();
        }
        // points on curve
        ctx.fillStyle = '#00e8ff';
        for(var pi=0; pi<pts2.length; pi++){
          var pp2 = pts2[pi];
          ctx.beginPath();
          ctx.arc(sxs+pp2.x*sxs, sys+(p-pp2.y)*sys, 3, 0, Math.PI*2);
          ctx.fill();
        }
        // base P = first point
        if(pts2.length){
          var P2 = pts2[Math.min(2, pts2.length-1)];
          var cur2 = P2; var chain = [P2];
          for(var ki=1; ki<k; ki++){
            var n2 = ptAddFp(cur2,P2,a,p);
            if(!n2) break;
            chain.push(n2);
            cur2 = n2;
          }
          // overlay
          for(var ci=0; ci<chain.length; ci++){
            var cp = chain[ci];
            ctx.fillStyle = ci===0 ? '#ff00ea' : (ci===chain.length-1 ? '#ffe700' : '#00ff41');
            ctx.beginPath();
            ctx.arc(sxs+cp.x*sxs, sys+(p-cp.y)*sys, 6, 0, Math.PI*2);
            ctx.fill();
          }
          ctl.out.textContent = 'mode: F_'+p+'  |E|='+pts2.length+'  P=('+P2.x+','+P2.y+')  '+k+'P=('+(chain[chain.length-1]?chain[chain.length-1].x:'O')+','+(chain[chain.length-1]?chain[chain.length-1].y:'O')+')';
        }
      }
    }
    draw();
  })();

  /* =====================================================
     4. PRIME_SPIRAL
     ===================================================== */
  (function PRIME(){
    var c = $('prime-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var ctl = {
      n: $('prime-n'), type: $('prime-type'), twin: $('prime-twin'),
      redraw: $('prime-redraw'), out: $('prime-out')
    };
    function syncLabels(){ $('prime-n-v').textContent = ctl.n.value; }
    [ctl.n].forEach(function(el){ on(el,'input',syncLabels); });
    syncLabels();
    [ctl.type, ctl.twin].forEach(function(el){ on(el,'change',draw); });
    on(ctl.redraw,'click',draw);

    function sieve(n){
      var s = new Uint8Array(n+1);
      for(var i=2;i<=n;i++){
        if(!s[i]){
          for(var j=i*i;j<=n;j+=i) s[j]=1;
        }
      }
      return s; // s[i]==0 means prime (for i>=2)
    }

    function draw(){
      ctx.fillStyle = '#020408'; ctx.fillRect(0,0,W,H);
      var N = parseInt(ctl.n.value,10);
      var t = ctl.type.value;
      var twin = ctl.twin.value === '1';
      var s = sieve(N);
      var primeCount = 0;

      ctx.fillStyle = '#0a1018';
      var cx = W/2, cy = H/2;

      if(t === 'ulam'){
        // square spiral
        var x=0,y=0,dx=1,dy=0,segLen=1,segCount=0,turns=0;
        var step = Math.min(W,H) / (Math.sqrt(N)*1.05);
        for(var k=1;k<=N;k++){
          var sx = cx + x*step;
          var sy = cy - y*step;
          var isPrime = (k>=2 && !s[k]);
          var isTwin = isPrime && ((k>=2 && !s[k-2] && k-2>=2) || (k+2<=N && !s[k+2]));
          if(isPrime){
            primeCount++;
            if(twin && isTwin) ctx.fillStyle = '#ffe700';
            else ctx.fillStyle = '#00e8ff';
            ctx.fillRect(sx-1,sy-1,2,2);
          } else {
            ctx.fillStyle = 'rgba(50,70,90,0.15)';
            ctx.fillRect(sx,sy,1,1);
          }
          x += dx; y += dy; segCount++;
          if(segCount === segLen){ segCount = 0; var t2 = dx; dx = -dy; dy = t2; turns++; if(turns%2===0) segLen++; }
        }
      } else if(t === 'sacks'){
        // r = sqrt(n), theta = 2*pi*sqrt(n)
        var scale = Math.min(W,H)*0.45 / Math.sqrt(N);
        for(var k2=1;k2<=N;k2++){
          var r = Math.sqrt(k2)*scale;
          var th = 2*Math.PI*Math.sqrt(k2);
          var sx2 = cx + r*Math.cos(th);
          var sy2 = cy + r*Math.sin(th);
          var prime2 = (k2>=2 && !s[k2]);
          if(prime2){
            primeCount++;
            ctx.fillStyle = twin && k2>=2 && !s[k2-2] && k2-2>=2 ? '#ffe700' : '#00ff41';
            ctx.fillRect(sx2,sy2,2,2);
          } else {
            ctx.fillStyle = 'rgba(50,70,90,0.10)';
            ctx.fillRect(sx2,sy2,1,1);
          }
        }
      } else {
        // vogel
        var phi = Math.PI*(3 - Math.sqrt(5));
        var sc = Math.min(W,H)*0.46 / Math.sqrt(N);
        for(var k3=1;k3<=N;k3++){
          var r3 = sc*Math.sqrt(k3);
          var th3 = k3*phi;
          var sx3 = cx + r3*Math.cos(th3);
          var sy3 = cy + r3*Math.sin(th3);
          var prime3 = (k3>=2 && !s[k3]);
          if(prime3){
            primeCount++;
            ctx.fillStyle = twin && k3>=2 && !s[k3-2] && k3-2>=2 ? '#ff00ea' : '#00e8ff';
            ctx.beginPath(); ctx.arc(sx3,sy3,1.6,0,Math.PI*2); ctx.fill();
          }
        }
      }
      ctl.out.textContent = 'N=' + N + '  primes<=N: ' + primeCount + '  density: ' + (primeCount/N*100).toFixed(2) + '%';
    }
    draw();
  })();

  /* =====================================================
     5. FLOW_FIELD (hash-gradient pseudo-Perlin)
     ===================================================== */
  (function FLOW(){
    var c = $('flow-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;

    var ctl = {
      n: $('flow-n'), scale: $('flow-scale'), speed: $('flow-speed'),
      fade: $('flow-fade'), pal: $('flow-pal'), reseed: $('flow-reseed'),
      out: $('flow-out')
    };
    function syncLabels(){
      $('flow-n-v').textContent = ctl.n.value;
      $('flow-scale-v').textContent = (parseInt(ctl.scale.value,10)/100).toFixed(2);
      $('flow-speed-v').textContent = (parseInt(ctl.speed.value,10)/10).toFixed(1);
      $('flow-fade-v').textContent  = (parseInt(ctl.fade.value,10)/100).toFixed(2);
    }
    [ctl.n,ctl.scale,ctl.speed,ctl.fade].forEach(function(el){ on(el,'input',syncLabels); });
    syncLabels();

    // Hash-based pseudo Perlin
    function hash2(ix,iy){
      var h = (ix*374761393 + iy*668265263) | 0;
      h = (h ^ (h>>>13)) * 1274126177;
      h = h ^ (h>>>16);
      return ((h>>>0)/4294967295);
    }
    function smoothNoise(x,y){
      var ix = Math.floor(x), iy = Math.floor(y);
      var fx = x - ix, fy = y - iy;
      function fade(t){ return t*t*t*(t*(t*6-15)+10); }
      var u = fade(fx), v = fade(fy);
      var a = hash2(ix,iy), b = hash2(ix+1,iy), c2 = hash2(ix,iy+1), d = hash2(ix+1,iy+1);
      var i1 = a + u*(b-a);
      var i2 = c2 + u*(d-c2);
      return i1 + v*(i2-i1);
    }

    var particles = [];
    function reseed(){
      particles = [];
      var n = parseInt(ctl.n.value,10);
      for(var i=0;i<n;i++) particles.push({x:Math.random()*W, y:Math.random()*H, life:Math.random()*200});
      ctx.fillStyle = '#020408'; ctx.fillRect(0,0,W,H);
    }
    on(ctl.reseed,'click',reseed);
    reseed();

    var t0 = performance.now(); var fps=0; var frames=0; var fpsT=t0;
    function frame(){
      var now = performance.now();
      var dt = (now - t0)/1000;
      var pal = PAL[ctl.pal.value] || PAL.cyber;
      var scale = parseInt(ctl.scale.value,10)/100;
      var speed = parseInt(ctl.speed.value,10)/10;
      var fade = parseInt(ctl.fade.value,10)/100;
      var n = parseInt(ctl.n.value,10);
      while(particles.length < n) particles.push({x:Math.random()*W, y:Math.random()*H, life:Math.random()*200});
      while(particles.length > n) particles.pop();

      ctx.fillStyle = 'rgba(2,4,8,'+fade+')';
      ctx.fillRect(0,0,W,H);

      for(var i=0;i<particles.length;i++){
        var p = particles[i];
        var ang = smoothNoise(p.x*scale, p.y*scale + dt*0.4) * Math.PI*4;
        var nx = p.x + Math.cos(ang)*speed;
        var ny = p.y + Math.sin(ang)*speed;
        ctx.strokeStyle = pal((Math.sin(ang)+1)/2);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(nx,ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life--;
        if(p.x<0||p.x>W||p.y<0||p.y>H||p.life<=0){
          p.x = Math.random()*W; p.y = Math.random()*H; p.life = 100+Math.random()*200;
        }
      }

      frames++;
      if(now - fpsT > 500){ fps = Math.round(frames*1000/(now-fpsT)); frames=0; fpsT=now; }
      ctl.out.textContent = 'fps: '+fps+'  live: '+particles.length+'  scale: '+scale.toFixed(2);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* =====================================================
     6. CHAOS_IFS
     ===================================================== */
  (function IFS(){
    var c = $('ifs-canvas'); if(!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    var ctl = { sys: $('ifs-sys'), iter: $('ifs-iter'), go: $('ifs-go'), out: $('ifs-out') };
    function syncLabels(){ $('ifs-iter-v').textContent = ctl.iter.value; }
    on(ctl.iter,'input',syncLabels); syncLabels();
    on(ctl.sys,'change',run); on(ctl.go,'click',run);

    var SYS = {
      sierpinski: {
        // 3 vertex chaos game
        kind: 'chaos',
        verts: [[0.5,0.05],[0.05,0.95],[0.95,0.95]],
        ratio: 0.5,
        color: function(i){ return 'rgba(0,232,255,0.5)'; }
      },
      carpet: {
        kind: 'ifs',
        maps: (function(){
          var m=[]; for(var ii=0;ii<3;ii++) for(var jj=0;jj<3;jj++){ if(ii===1&&jj===1) continue; m.push([1/3,0,0,1/3,ii/3,jj/3,1/8]); } return m;
        })(),
        color: function(){ return 'rgba(0,255,65,0.5)'; }
      },
      fern: {
        kind: 'ifs',
        // [a,b,c,d,e,f, prob]
        maps: [
          [0,0,0,0.16,0,0, 0.01],
          [0.85,0.04,-0.04,0.85,0,1.6, 0.85],
          [0.20,-0.26,0.23,0.22,0,1.6, 0.07],
          [-0.15,0.28,0.26,0.24,0,0.44, 0.07]
        ],
        scale: function(p){ return [W/2 + p[0]*W*0.18, H - p[1]*H*0.09]; },
        color: function(){ return 'rgba(0,255,65,0.45)'; }
      },
      dragon: {
        kind: 'ifs',
        maps: [
          [0.5,-0.5,0.5,0.5,0,0, 0.5],
          [-0.5,-0.5,0.5,-0.5,1,0, 0.5]
        ],
        scale: function(p){ return [W*0.25 + p[0]*W*0.45, H*0.4 + p[1]*H*0.45]; },
        color: function(){ return 'rgba(255,0,234,0.45)'; }
      },
      tree: {
        kind: 'ifs',
        maps: [
          [0.05,0,0,0.6,0,0, 0.10],
          [0.05,0,0,-0.5,0,1, 0.10],
          [0.46,-0.32,0.39,0.38,0,0.6, 0.20],
          [0.47,-0.15,0.17,0.42,0,1.1, 0.20],
          [0.43,0.28,-0.25,0.45,0,1, 0.20],
          [0.42,0.26,-0.35,0.31,0,0.7, 0.20]
        ],
        scale: function(p){ return [W/2 + p[0]*W*0.30, H - p[1]*H*0.32]; },
        color: function(){ return 'rgba(255,165,0,0.45)'; }
      },
      koch: {
        kind: 'lsys',
        axiom: 'F++F++F',
        rules: { 'F': 'F-F++F-F' },
        angle: 60,
        iter: 5,
        color: 'rgba(0,232,255,0.85)'
      }
    };

    function affine(m, x, y){
      return [m[0]*x + m[1]*y + m[4], m[2]*x + m[3]*y + m[5]];
    }
    function pickMap(maps){
      var r = Math.random(), cum = 0;
      for(var i=0;i<maps.length;i++){ cum += maps[i][6]; if(r < cum) return maps[i]; }
      return maps[maps.length-1];
    }

    function lsysExpand(s, rules, iter){
      for(var i=0;i<iter;i++){
        var out = '';
        for(var j=0;j<s.length;j++){ out += rules[s[j]] || s[j]; }
        s = out;
      }
      return s;
    }
    function drawLsys(s, angleDeg, color){
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      var stack = []; var x = W*0.15, y = H*0.6, a = 0;
      var step = 6;
      for(var i=0;i<s.length;i++){
        var ch = s[i];
        if(ch === 'F' || ch === 'G'){
          var nx = x + step*Math.cos(a), ny = y + step*Math.sin(a);
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke();
          x=nx; y=ny;
        } else if(ch === '+') a += angleDeg*Math.PI/180;
        else if(ch === '-') a -= angleDeg*Math.PI/180;
        else if(ch === '[') stack.push([x,y,a]);
        else if(ch === ']'){ var st=stack.pop(); x=st[0]; y=st[1]; a=st[2]; }
      }
    }

    function run(){
      ctx.fillStyle = '#020408'; ctx.fillRect(0,0,W,H);
      var sys = SYS[ctl.sys.value];
      var iter = parseInt(ctl.iter.value,10);
      var plotted = 0;

      if(sys.kind === 'chaos'){
        var p = [Math.random(), Math.random()];
        for(var i=0;i<iter;i++){
          var v = sys.verts[Math.floor(Math.random()*sys.verts.length)];
          p = [(p[0]+v[0])*sys.ratio, (p[1]+v[1])*sys.ratio];
          ctx.fillStyle = sys.color(i);
          ctx.fillRect(p[0]*W, p[1]*H, 1, 1);
          plotted++;
        }
      } else if(sys.kind === 'ifs'){
        var p2 = [0,0];
        for(var i2=0;i2<iter;i2++){
          var m = pickMap(sys.maps);
          p2 = affine(m, p2[0], p2[1]);
          if(i2 > 20){
            var screen = sys.scale ? sys.scale(p2) : [p2[0]*W, p2[1]*H];
            ctx.fillStyle = sys.color(i2);
            ctx.fillRect(screen[0], screen[1], 1, 1);
            plotted++;
          }
        }
      } else if(sys.kind === 'lsys'){
        var s = lsysExpand(sys.axiom, sys.rules, sys.iter);
        drawLsys(s, sys.angle, sys.color);
        plotted = s.length;
      }
      ctl.out.textContent = 'system: '+ctl.sys.value+'  points/segments: '+plotted;
    }
    run();
  })();

})();
