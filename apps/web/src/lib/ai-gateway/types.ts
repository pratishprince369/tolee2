export type AIProviderType =
  | 'gemini_web2api'
  | 'gemini_official'
  | 'openai'
  | 'claude'
  | 'nvidia';

export interface AIMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface AIPersonaConfig {
  id?: string;
  name: string;
  avatar?: string | null;
  systemPrompt: string;
  tone?: string;
  language?: string;
  responseLength?: string;
  formality?: string;
  emojiBehavior?: string;
  voiceName?: string;
  voiceGender?: string;
  voiceSpeed?: number;
  preferredProvider?: string;
  preferredModel?: string;
}

export interface AIRequestOptions {
  messages: AIMessagePayload[];
  persona?: AIPersonaConfig | null;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  userId?: string;
  conversationId?: string;
  signal?: AbortSignal;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
  model?: string;
  provider?: string;
  finishReason?: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AICompletionResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface SmartReplySuggestion {
  id: string;
  text: string;
  tone: string;
  emoji?: string;
}

export interface GroupAIActionRequest {
  action: 'summarize' | 'translate' | 'explain' | 'poll' | 'suggest';
  targetMessageContent?: string;
  recentMessages?: AIMessagePayload[];
  targetLanguage?: string;
  prompt?: string;
}

export interface LiveVoiceSessionTokenResponse {
  token: string;
  endpoint: string;
  voiceName: string;
  model: string;
  expiresAt: string;
}

export interface AIProvider {
  readonly name: string;
  readonly type: AIProviderType;
  isAvailable(): Promise<boolean>;
  generateText(options: AIRequestOptions): Promise<AICompletionResult>;
  streamText(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult>;
}
