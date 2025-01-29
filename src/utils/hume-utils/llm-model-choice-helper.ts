import { z } from 'zod';
import { MODEL_LIMITS, SupportedModel } from '@/utils/hume-utils/hume-context-tracker';

// Helper function to validate model
function validateModel(model: string): model is SupportedModel {
  return Object.keys(MODEL_LIMITS).includes(model);
}

// Define the schema for our environment variables
const envSchema = z.object({
  // OpenRouter config
  USE_OPENROUTER: z.string()
    .transform(val => val === 'true')
    .default('false'), // Default to false if not set

  // Base URLs
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),

  // API Keys
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPEN_ROUTER_API_KEY: z.string(),

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
export function getBaseUrl(useOpenRouter: boolean | undefined = false): string {
  return useOpenRouter ? config.OPENROUTER_BASE_URL : config.OPENAI_BASE_URL;
}

// Export API key helper
export function getApiKey(useOpenRouter: boolean | undefined = false): string {
  return useOpenRouter ? config.OPEN_ROUTER_API_KEY : config.OPENAI_API_KEY;
}

// Export model name helper
export function getModelName(useOpenRouter: boolean | undefined = false): SupportedModel {
  return useOpenRouter ? config.OPEN_ROUTER_MODEL : config.OPENAI_MODEL;
} 