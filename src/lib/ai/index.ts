import type {
  GenerateTextParams,
  GenerateObjectParams,
  StreamTextParams,
  AIProviderResult,
  AITask,
  ProviderConfig,
  PipelineTraceStep,
} from './provider/types';
import { routeGenerateText, routeObject } from './provider/router';
import { getMetrics } from './provider/router';
import { checkHealth } from './provider/health';

export type { AITask, AIProviderResult, GenerateTextParams, GenerateObjectParams, StreamTextParams, ProviderConfig, PipelineTraceStep };

const DEFAULT_CONFIG: ProviderConfig = {
  selectedProvider: 'openai',
  selectedModel: 'openai/gpt-4o-mini',
  mode: 'single',
  fallbackEnabled: false,
};

class AIRouter {
  private userConfigs = new Map<string, ProviderConfig>();

  setUserConfig(userId: string, config: ProviderConfig) {
    this.userConfigs.set(userId, config);
  }

  getUserConfig(userId: string): ProviderConfig | undefined {
    return this.userConfigs.get(userId);
  }

  async generate(
    task: AITask,
    params: GenerateTextParams,
    config?: ProviderConfig,
  ): Promise<AIProviderResult & { trace?: PipelineTraceStep }> {
    const cfg = config ?? DEFAULT_CONFIG;
    return routeGenerateText(task, params, cfg);
  }

  async generateObject(
    task: AITask,
    params: GenerateObjectParams,
    config?: ProviderConfig,
  ): Promise<AIProviderResult & { trace?: PipelineTraceStep }> {
    const cfg = config ?? DEFAULT_CONFIG;
    return routeObject(task, params, cfg);
  }

  getMetrics() {
    return getMetrics();
  }

  async health() {
    return checkHealth();
  }
}

export const ai = new AIRouter();
export { getMetrics, checkHealth };
