import type {
  GenerateTextParams,
  GenerateObjectParams,
  AIProviderResult,
  AITask,
  ProviderId,
  ProviderMetrics,
  ProviderConfig,
  PipelineTraceStep,
  ProviderMode,
} from './types';
import { MODELS, AUTO_MODE_CHAINS, getModelsForProvider } from './models';
import { getProvider, isProviderAvailable } from './factory';

const metrics: ProviderMetrics[] = [];
const MAX_METRICS = 1000;

function recordMetric(m: ProviderMetrics) {
  metrics.push(m);
  if (metrics.length > MAX_METRICS) metrics.shift();
}

export function getMetrics(): ProviderMetrics[] {
  return [...metrics];
}

function createRequestId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export class ProviderValidationError extends Error {
  constructor(expected: ProviderId, attempted: string) {
    super(`Provider validation failed: expected "${expected}" but received "${attempted}". All requests must use the configured provider.`);
    this.name = 'ProviderValidationError';
  }
}

function validateProviderConfig(config: ProviderConfig): ProviderConfig {
  if (!config.selectedProvider) {
    throw new Error('No provider selected. Configure a provider in Settings.');
  }
  if (!isProviderAvailable(config.selectedProvider)) {
    throw new Error(`Provider "${config.selectedProvider}" is not available. Check your API key in Settings.`);
  }
  return config;
}

function resolveSingleProviderModel(providerId: ProviderId): string {
  const models = getModelsForProvider(providerId);
  if (models.length === 0) {
    throw new Error(`No models configured for provider "${providerId}".`);
  }
  return models[0].id;
}

function resolveAutoModel(task: AITask, providerId: ProviderId): string | null {
  const chain = AUTO_MODE_CHAINS[task];
  if (!chain || chain.length === 0) return null;
  for (const modelId of chain) {
    const model = MODELS[modelId];
    if (model && model.provider === providerId && isProviderAvailable(providerId)) {
      return modelId;
    }
  }
  return null;
}

export async function routeGenerateText(
  task: AITask,
  params: GenerateTextParams,
  config?: ProviderConfig,
): Promise<AIProviderResult & { trace?: PipelineTraceStep }> {
  const cfg = config ?? { selectedProvider: 'openai', selectedModel: '', mode: 'single' as ProviderMode, fallbackEnabled: false };
  validateProviderConfig(cfg);

  const requestId = createRequestId();
  const start = performance.now();

  let modelId: string;
  if (cfg.selectedModel && MODELS[cfg.selectedModel]) {
    modelId = cfg.selectedModel;
  } else if (cfg.mode === 'auto') {
    const autoModel = resolveAutoModel(task, cfg.selectedProvider);
    modelId = autoModel ?? resolveSingleProviderModel(cfg.selectedProvider);
  } else {
    modelId = resolveSingleProviderModel(cfg.selectedProvider);
  }

  const model = MODELS[modelId];
  if (!model) {
    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency: 0, finishReason: 'error', data: null,
      error: `Model "${modelId}" not found in configuration.`,
    };
  }

  const provider = getProvider(cfg.selectedProvider);
  if (!provider) {
    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency: 0, finishReason: 'error', data: null,
      error: `Provider "${cfg.selectedProvider}" is not available.`,
    };
  }

  try {
    const result = await provider.generateText(params, model);
    const latency = Math.round(performance.now() - start);

    const trace: PipelineTraceStep = {
      stage: task,
      provider: cfg.selectedProvider,
      model: model.displayName,
      latency,
      tokens: result.usage ? { prompt: result.usage.promptTokens, completion: result.usage.completionTokens, total: result.usage.totalTokens } : undefined,
      success: result.success,
    };

    recordMetric({
      provider: cfg.selectedProvider, model: modelId,
      latency, tokens: result.usage
        ? { prompt: result.usage.promptTokens, completion: result.usage.completionTokens, total: result.usage.totalTokens }
        : { prompt: 0, completion: 0, total: 0 },
      retries: 0, fallback: false, success: result.success, timestamp: Date.now(), requestId,
    });

    return {
      ...result,
      provider: cfg.selectedProvider,
      model: modelId,
      trace,
    };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (cfg.fallbackEnabled) {
      const fallbackProviders: ProviderId[] = ['openai', 'anthropic', 'gemini', 'nvidia', 'openrouter', 'ollama']
        .filter(p => p !== cfg.selectedProvider) as ProviderId[];
      for (const fbProvider of fallbackProviders) {
        if (!isProviderAvailable(fbProvider)) continue;
        const fbModelId = resolveSingleProviderModel(fbProvider);
        if (!fbModelId) continue;
        const fbModel = MODELS[fbModelId];
        if (!fbModel) continue;
        const fbProviderImpl = getProvider(fbProvider);
        if (!fbProviderImpl) continue;
        try {
          const fbResult = await fbProviderImpl.generateText(params, fbModel);
          const fbLatency = Math.round(performance.now() - start);
          return {
            ...fbResult, provider: fbProvider, model: fbModelId,
            latency: fbLatency,
            trace: { stage: task, provider: fbProvider, model: fbModel.displayName, latency: fbLatency, success: fbResult.success },
          };
        } catch { continue; }
      }
    }

    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency, finishReason: 'error', data: null, error: errorMessage,
      trace: { stage: task, provider: cfg.selectedProvider, model: modelId, latency, success: false },
    };
  }
}

export async function routeObject(
  task: AITask,
  params: GenerateObjectParams,
  config?: ProviderConfig,
): Promise<AIProviderResult & { trace?: PipelineTraceStep }> {
  const cfg = config ?? { selectedProvider: 'openai', selectedModel: '', mode: 'single' as ProviderMode, fallbackEnabled: false };
  validateProviderConfig(cfg);

  const requestId = createRequestId();
  const start = performance.now();

  let modelId: string;
  if (cfg.selectedModel && MODELS[cfg.selectedModel]) {
    modelId = cfg.selectedModel;
  } else if (cfg.mode === 'auto') {
    const autoModel = resolveAutoModel(task, cfg.selectedProvider);
    modelId = autoModel ?? resolveSingleProviderModel(cfg.selectedProvider);
  } else {
    modelId = resolveSingleProviderModel(cfg.selectedProvider);
  }

  const model = MODELS[modelId];
  if (!model) {
    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency: 0, finishReason: 'error', data: null,
      error: `Model "${modelId}" not found in configuration.`,
    };
  }

  const provider = getProvider(cfg.selectedProvider);
  if (!provider) {
    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency: 0, finishReason: 'error', data: null,
      error: `Provider "${cfg.selectedProvider}" is not available.`,
    };
  }

  try {
    const result = await provider.generateObject(params, model);
    const latency = Math.round(performance.now() - start);

    const trace: PipelineTraceStep = {
      stage: task,
      provider: cfg.selectedProvider,
      model: model.displayName,
      latency,
      tokens: result.usage ? { prompt: result.usage.promptTokens, completion: result.usage.completionTokens, total: result.usage.totalTokens } : undefined,
      success: result.success,
    };

    recordMetric({
      provider: cfg.selectedProvider, model: modelId,
      latency, tokens: result.usage
        ? { prompt: result.usage.promptTokens, completion: result.usage.completionTokens, total: result.usage.totalTokens }
        : { prompt: 0, completion: 0, total: 0 },
      retries: 0, fallback: false, success: result.success, timestamp: Date.now(), requestId,
    });

    return { ...result, provider: cfg.selectedProvider, model: modelId, trace };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (cfg.fallbackEnabled) {
      const fallbackProviders: ProviderId[] = ['openai', 'anthropic', 'gemini', 'nvidia', 'openrouter', 'ollama']
        .filter(p => p !== cfg.selectedProvider) as ProviderId[];
      for (const fbProvider of fallbackProviders) {
        if (!isProviderAvailable(fbProvider)) continue;
        const fbModelId = resolveSingleProviderModel(fbProvider);
        if (!fbModelId) continue;
        const fbModel = MODELS[fbModelId];
        if (!fbModel) continue;
        const fbProviderImpl = getProvider(fbProvider);
        if (!fbProviderImpl) continue;
        try {
          const fbResult = await fbProviderImpl.generateObject(params, fbModel);
          const fbLatency = Math.round(performance.now() - start);
          return {
            ...fbResult, provider: fbProvider, model: fbModelId,
            latency: fbLatency,
            trace: { stage: task, provider: fbProvider, model: fbModel.displayName, latency: fbLatency, success: fbResult.success },
          };
        } catch { continue; }
      }
    }

    return {
      success: false, provider: cfg.selectedProvider, model: modelId,
      latency, finishReason: 'error', data: null, error: errorMessage,
      trace: { stage: task, provider: cfg.selectedProvider, model: modelId, latency, success: false },
    };
  }
}
