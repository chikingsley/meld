import { z } from 'zod';
import { MODEL_LIMITS, SupportedModel } from './hume-context-tracker';

// Helper function to validate model
function validateModel(model: string): model is SupportedModel {
  // Check direct format (e.g. gpt-4o)
  if (Object.keys(MODEL_LIMITS).includes(model)) {
    return true;
  }
  
  // Check namespaced format (e.g. openai/gpt-4o)
  const withoutNamespace = model.split('/').pop() || '';
  return Object.keys(MODEL_LIMITS).includes(withoutNamespace);
}

// Define the schema for our environment variables
const envSchema = z.object({
  // Platform config
  USE_PLATFORM: z.enum(['MISTRAL', 'OPENAI', 'OPEN_ROUTER'])
    .default('OPENAI'),

  // Base URLs
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  MISTRAL_BASE_URL: z.string().default('https://api.mistral.ai/v1'),

  // API Keys
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPEN_ROUTER_API_KEY: z.string(),
  MISTRAL_API_KEY: z.string(),

  // Models
  OPENAI_MODEL: z.string()
    .refine(validateModel, (val) => ({
      message: `Unsupported model: ${val}. Supported models: ${Object.keys(MODEL_LIMITS).join(', ')}`
    }))
    .transform((val) => val as SupportedModel),
  OPEN_ROUTER_MODEL: z.string()
    .refine(validateModel, (val) => ({
      message: `Unsupported model: ${val}. Supported models: ${Object.keys(MODEL_LIMITS).join(', ')}`
    }))
    .transform((val) => val as SupportedModel),
  MISTRAL_MODEL: z.string()
    .refine(validateModel, (val) => ({
      message: `Unsupported model: ${val}. Supported models: ${Object.keys(MODEL_LIMITS).join(', ')}`
    }))
    .transform((val) => val as SupportedModel),

  // Optional variables
  MEM0_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Create a type from our schema
type EnvConfig = z.infer<typeof envSchema>;

// Validate environment variables at startup
function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n');
      throw new Error(`❌ Invalid environment variables:\n${issues}`);
    }
    throw error;
  }
}

// Export the validated config
export const config = validateEnv();

// Export base URL helper
export function getBaseUrl(platform: string = 'OPENAI'): string {
  switch (platform) {
    case 'MISTRAL': return config.MISTRAL_BASE_URL;
    case 'OPEN_ROUTER': return config.OPENROUTER_BASE_URL;
    default: return config.OPENAI_BASE_URL;
  }
}

// Export API key helper
export function getApiKey(platform: string = 'OPENAI'): string {
  switch (platform) {
    case 'MISTRAL': return config.MISTRAL_API_KEY;
    case 'OPEN_ROUTER': return config.OPEN_ROUTER_API_KEY;
    default: return config.OPENAI_API_KEY;
  }
}

// Export model name helper
export function getModelName(platform: string = 'OPENAI'): SupportedModel {
  switch (platform) {
    case 'MISTRAL': return config.MISTRAL_MODEL;
    case 'OPEN_ROUTER': return config.OPEN_ROUTER_MODEL;
    default: return config.OPENAI_MODEL;
  }
} 