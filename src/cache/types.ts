export type ExternalCacheAdapter = {
  reset(): Promise<void>;
  dispose(): Promise<void>;
};
