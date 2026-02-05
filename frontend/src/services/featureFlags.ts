
// Feature Flag Service
// This service manages which modules are enabled in the application.
// In the future, this could fetch flags from the backend or an external service.

export interface FeatureFlags {
  enablePipelines: boolean;
  enableCostAnalysis: boolean;
  enableAiChat: boolean;
  enableArgoCd: boolean;
  enableOptimization: boolean;
}

const defaultFlags: FeatureFlags = {
  // Disabled by default as per v1.4.0 release notes / user context
  enablePipelines: false,
  // We will enable this via flag, though backend service might need uncommenting
  enableCostAnalysis: true,

  // Enabled core features
  enableAiChat: true,
  enableArgoCd: true,
  enableOptimization: true,
};

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    // Load from environment variables if available, otherwise use defaults
    this.flags = {
      ...defaultFlags,
      // specific overrides can go here
      // enablePipelines: import.meta.env.VITE_ENABLE_PIPELINES === 'true',
    };
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}

export const featureFlagService = new FeatureFlagService();
export const useFeatureFlags = () => featureFlagService;
