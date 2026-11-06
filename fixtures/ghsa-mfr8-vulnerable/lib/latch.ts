type LatchState = {
  armed: boolean;
  gate: Promise<void>;
  resolveGate: (() => void) | null;
};

const GLOBAL_KEY = "__nci_mfr8_latch__";

function state(): LatchState {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: LatchState;
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      armed: false,
      gate: Promise.resolve(),
      resolveGate: null,
    };
  }
  return g[GLOBAL_KEY];
}

export function armLatch(holdMs = 2000): void {
  const s = state();
  s.armed = true;
  s.gate = new Promise<void>((resolve) => {
    s.resolveGate = resolve;
    setTimeout(() => {
      s.resolveGate?.();
      s.resolveGate = null;
    }, holdMs);
  });
}

export function releaseLatch(): void {
  const s = state();
  s.resolveGate?.();
  s.resolveGate = null;
}

export function disarmLatch(): void {
  const s = state();
  s.armed = false;
  releaseLatch();
  s.gate = Promise.resolve();
}

export async function waitIfArmed(): Promise<void> {
  const s = state();
  if (s.armed) {
    await s.gate;
  }
}
