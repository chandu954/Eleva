import {
  getModelById,
  getProviderById,
  type AIModel,
} from "@/lib/ai-models";
import type { ServiceName } from "@/lib/types";

interface APIKeyInput {
  service: string;
  key: string;
  addedAt?: string;
}

export interface ResolveAIRequestInput {
  requestedModel: string;
  apiKeys: APIKeyInput[];
  isPro: boolean;
}

export interface ResolvedAIRequest {
  providerId: ServiceName;
  modelId: string;
  apiKey: string;
  usedServerKey: boolean;
  requiresRateLimit: boolean;
}

type HiddenModel = Pick<AIModel, "id" | "name" | "provider" | "features" | "availability">;

const HIDDEN_MODELS: Record<string, HiddenModel> = {};

function getKnownModel(modelId: string): HiddenModel | undefined {
  return getModelById(modelId) ?? HIDDEN_MODELS[modelId];
}

function getServerKey(providerId: ServiceName) {
  const provider = getProviderById(providerId);
  if (!provider) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  return {
    provider,
    apiKey: process.env[provider.envKey],
  };
}

export function resolveAIRequest(input: ResolveAIRequestInput): ResolvedAIRequest {
  const model = getKnownModel(input.requestedModel);

  if (!model) {
    throw new Error(`Unknown model: ${input.requestedModel}`);
  }

  const provider = getProviderById(model.provider);
  if (!provider) {
    throw new Error(`Unsupported provider: ${model.provider}`);
  }

  if (provider.id !== 'openrouter') {
    throw new Error(`Only OpenRouter is supported. Requested provider: ${provider.id}`);
  }

  const { apiKey } = getServerKey('openrouter');

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured on the server');
  }

  return {
    providerId: 'openrouter',
    modelId: model.id,
    apiKey,
    usedServerKey: true,
    requiresRateLimit: model.features.isFree !== true,
  };
}
