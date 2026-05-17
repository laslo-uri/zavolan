export function attachHeroBrand3D(detail) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const brand = detail?.querySelector('.home-hero-brand');
  const inner = brand?.querySelector('.home-hero-brand-inner');
  if (!brand || !inner) return;

  const MAX_TILT = 10;
  const SMOOTH = 0.18;
  const LIFT_Z = 14;

  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;
  let targetX = 0;
  let targetY = 0;
  let targetZ = 0;
  let rafId = null;

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function animate() {
    currentX = lerp(currentX, targetX, SMOOTH);
    currentY = lerp(currentY, targetY, SMOOTH);
    currentZ = lerp(currentZ, targetZ, SMOOTH * 1.2);
    const tilt = `perspective(1200px) rotateX(${-currentY}deg) rotateY(${currentX}deg)`;
    const lift = currentZ > 0.5 ? ` translateZ(${currentZ}px)` : '';
    inner.style.transform = tilt + lift;
    const moving = Math.abs(currentX - targetX) > 0.02 || Math.abs(currentY - targetY) > 0.02 || Math.abs(currentZ - targetZ) > 0.5;
    if (moving) rafId = requestAnimationFrame(animate);
    else rafId = null;
  }

  function onMove(e) {
    const rect = brand.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    targetX = (x / (rect.width / 2)) * MAX_TILT;
    targetY = (y / (rect.height / 2)) * MAX_TILT;
    targetZ = LIFT_Z;
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function onLeave() {
    targetX = 0;
    targetY = 0;
    targetZ = 0;
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  brand.addEventListener('mousemove', onMove, { passive: true });
  brand.addEventListener('mouseleave', onLeave);
}
