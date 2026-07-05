// Web Audio API Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a pleasant "Ting" sound for success/select
export function playSuccessSound() {
  const isMuted = localStorage.getItem('isMuted') === 'true';
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Start at a high frequency
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error("Audio error", e);
  }
}

// Play a low "Buzz/Beep" sound for warnings
export function playWarningSound() {
  const isMuted = localStorage.getItem('isMuted') === 'true';
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.setValueAtTime(120, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error("Audio error", e);
  }
}

// Trigger haptic feedback
export function triggerHaptic(type = 'success') {
  if (!navigator.vibrate) return;
  
  const isMuted = localStorage.getItem('isMuted') === 'true';
  if (isMuted) return; // Mute disables haptics as well (or maybe we shouldn't? Let's disable both)

  if (type === 'success') {
    navigator.vibrate([30]); // Short light tap
  } else if (type === 'warning') {
    navigator.vibrate([50, 50, 50]); // Two heavy taps
  }
}
