import {
  createRoot,
  createSignal,
  createMemo,
  onCleanup,
  enableExternalSource,
  startTransition
} from "../src";
import { Transition } from "../src/reactive/signal";

import "./MessageChannel";

global.queueMicrotask = setImmediate;

class ExternalSource<T = any> {
  listeners: Set<() => void> = new Set();

  constructor(private value: T) {}

  update(x: T) {
    this.value = x;
    this.listeners.forEach(x => x());
  }

  get() {
    this.listeners.add(listener!);
    sources.get(listener!)!.add(this);
    return this.value;
  }

  removeListener(listener: () => void) {
    this.listeners.delete(listener);
  }
}

let listener: (() => void) | null = null;

let sources: Map<() => void, Set<ExternalSource>> = new Map();

enableExternalSource((fn, trigger) => {
  sources.set(trigger, new Set());
  onCleanup(() => {
    sources.get(trigger)!.forEach(x => x.removeListener(trigger));
    sources.delete(trigger);
  });
  return x => {
    const tmp = listener;
    // trigger could play the role of listener，as it has stable reference
    listener = trigger;
    try {
      return fn(x);
    } finally {
      listener = tmp;
    }
  };
});

enableExternalSource(fn => fn); // do nothing, make sure multiple factories be piped.

describe("external source", () => {
  it("should trigger solid primitive update", () => {
    createRoot(() => {
      const e = new ExternalSource(0);
      const memo = createMemo(() => {
        return e.get();
      });
      expect(memo()).toBe(0);
      e.update(1);
      expect(memo()).toBe(1);
    });
  });

  it("should make `startTransition` noneffective", async () => {
    const [signal, setSignal] = createSignal(0);
    await new Promise<void>(res => {
      startTransition(() => {
        expect(Transition).toBeFalsy();
        setSignal(1);
      }, res);
      // presumption: startTransition fn will not run immediately if no running transition.
      expect(signal()).toBe(0);
    });
    expect(signal()).toBe(1);
  });
});