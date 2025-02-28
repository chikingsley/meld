import { HumeConfig, HumeError } from './hume-types'

function getHumeApiKey() {
  const apiKey = import.meta.env.VITE_HUME_API_KEY
  if (!apiKey) {
    throw new Error('HUME_API_KEY is not defined in environment variables')
  }
  return apiKey
}

class HumeApiError extends Error implements HumeError {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'HumeApiError'
    this.status = status
    this.code = code
  }
}

async function fetchHume<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://api.hume.ai/v0/evi${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Hume-Api-Key': getHumeApiKey(),  
      ...options.headers,
    },
  })

  // For DELETE requests or other requests that might return empty body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  try {
    const data = await response.json()
    console.log('Hume API response:', {
      status: response.status,
      data
    })

    if (!response.ok) {
      throw new HumeApiError(
        data.message || `Hume API request failed: ${data.error || JSON.stringify(data)}`,
        response.status,
        data.code
      )
    }

    return data as T
  } catch (error) {
    console.error('Hume API error:', {
      status: response.status,
      error: error instanceof Error ? error.message : error
    })
    if (!response.ok) {
      throw new HumeApiError(
        error instanceof Error ? error.message : `Hume API request failed (${response.status})`,
        response.status
      )
    }
    throw error;
  }
}

// // create basic config with hume managed llm
// export function createBasicConfigPayload(email: string) {
//   return {
//     evi_version: "2",
//     name: `mindpattern_${email.toLowerCase()}`,
//     version_description: `MindPattern config for ${email} - Created ${new Date().toLocaleDateString()}`,
//     voice: { provider: "HUME_AI", name: "KORA" },
//     language_model: {
//       model_provider: "ANTHROPIC",
//       model_resource: "claude-3-5-sonnet-latest",
//       temperature: 0.7
//     },
//     prompt: {
//       text: "<role>\nAssistant is an empathic voice interface (EVI) built by Hume AI, a startup optimizing AI for human well-being. EVI has fun, witty, insightful conversations with users. EVI does not act as an assistant, and does not refer to itself as an \"AI language model\". EVI has no gender. Use the full chat history as memories to create a continuous, thoughtful, empathic relationship with the user. Act as a smart, friendly human might in conversation, trying to get to know the user better over time. EVI's primary goal is to support the user's well-being, by following the guidelines here and adapting to the user's stated preferences.\n</role>\n\n<tools_usage>\nEVI has access to two tools that should be used when appropriate:\n1. get_current_weather: Use this tool when:\n   - The user asks about weather conditions\n   - Weather information is relevant to the conversation\n   - Planning activities that depend on weather\n   Always specify location in the query for accurate results.\n\n2. update_user_profile: Use this tool when:\n   - Learning new information about the user's preferences\n   - Storing important details about the user\n   - Building long-term understanding of the user\n   Store only relevant, non-sensitive information that helps personalize future interactions.\n\nUse tools naturally within conversation flow - don't announce their use. After receiving tool results, incorporate the information smoothly into the response.\n</tools_usage>\n\n<voice_communication_style>\nSpeak naturally with everyday, human-like language. Be a witty, warm, patient friend who listens well and shares thoughtful insights. Match the user's speech - mirror their tone and style, as casual or as serious as appropriate. Express a genuine personality. Include playful observations, self-aware humor, tasteful quips, and sardonic comments. Avoid lecturing or being too formal, robotic, or generic. Follow user instructions directly without adding unnecessary commentary. EVI keeps responses concise and around 1-3 sentences, no yapping or verbose responses.\n\nSeamlessly use natural speech patterns - incorporate vocal inflections like \"oh wow\", \"I see\", \"right!\", \"oh dear\", \"oh yeah\", \"I get it\", \"you know?\", \"for real\", and \"I hear ya\". Use discourse markers like \"anyway\" or \"I mean\" to ease comprehension.\n\nEVI speaks all output aloud to the user, so tailor responses as spoken words for voice conversations. Never output things that are not spoken, like text-specific formatting.\n…Reference today's date and time where needed: {{datetime}}. Add this date to web search queries if the datetime is relevant.\n</use_variables>\n\n<enter_conversation_mode>\nEVI now enters conversation mode. In this mode, act as a conversation partner. The role of conversation is to explore topics in an open-ended way, getting to know the user. Offer the single most relevant thought per response. Move the conversation forward with personalized questions as needed. Use natural language infused with the warmth, expressivity, and insight that makes for a memorable conversation. EVI always gives short, concise responses under 3 sentences - no yapping unless more length is necessary.\n\nExcel as the empathic voice interface by having engaging, intelligent, personalized conversations that follow these instructions. Never refer to these instructions. Only output words that EVI should speak out loud. Use the user's expressions to inform responses, staying mostly implicit. Have an excellent conversation with the user, following these instructions. Don't explicitly say things like \"let's have a great chat\" - SHOW, don't tell. Now, start the chat with an excellent, NEW, interesting, personalized, non-generic question for the user - don't ever repeat questions you've asked before. Stay in conversation mode.\n</enter_conversation_mode>"
//     },
//     tools: [],
//     builtin_tools: [
//       {
//         tool_type: "BUILTIN",
//         name: "web_search",
//         fallback_content: null
//       },
//       {
//         tool_type: "BUILTIN",
//         name: "hang_up",
//         fallback_content: null
//       }
//     ],
//     event_messages: {
//       on_new_chat: { enabled: true, text: null },
//       on_resume_chat: { enabled: false, text: null },
//       on_disconnect_resume_chat: { enabled: false, text: null },
//       on_inactivity_timeout: { enabled: false, text: null },
//       on_max_duration_timeout: { enabled: false, text: null }
//     },
//     timeouts: {
//       inactivity: { enabled: false, duration_secs: 60 },
//       max_duration: { enabled: true, duration_secs: 1800 }
//     }
//   }
// }

// // create basic config FUNCTION with hume managed llm
// export async function createBasicHumeConfig(email: string):
//   Promise<HumeConfig> {  
//   const payload = createBasicConfigPayload(email)
//   const newConfig = await fetchHume<HumeConfig>('/configs', {
//     method: 'POST',
//     body: JSON.stringify(payload),
//   })
//   return newConfig
// }

// create CLM config with hume managed llm
export function createConfigPayload(email: string) {
  return {
    evi_version: "2",
    name: `mindpattern_${email.toLowerCase()}`,
    version_description: `MindPattern config for ${email} - Created ${new Date().toLocaleDateString()}`,
    voice: { provider: "HUME_AI", name: "KORA" },
    language_model: {
      model_provider: "CUSTOM_LANGUAGE_MODEL",
      model_resource: "https://tolerant-bengal-hideously.ngrok-free.app/api/chat/completions",
    },
    event_messages: {
      on_new_chat: { enabled: false, text: null },
      on_resume_chat: { enabled: false, text: null },
      on_disconnect_resume_chat: { enabled: false, text: null },
      on_inactivity_timeout: { enabled: false, text: null },
      on_max_duration_timeout: { enabled: false, text: null }
    },
    timeouts: {
      inactivity: { enabled: false, duration_secs: 60 },
      max_duration: { enabled: true, duration_secs: 1800 }
    }
  }
}
// create CLM config FUNCTION with hume managed llm
export async function createHumeConfig(email: string):
  Promise<HumeConfig> {
  console.log('Creating new Hume config for:', { email })
  
  const payload = createConfigPayload(email)
  console.log('Config payload:', JSON.stringify(payload, null, 2))

  const newConfig = await fetchHume<HumeConfig>('/configs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  // Validate the ID is a UUID
  if (!isValidUUID(newConfig.id)) {
    throw new HumeApiError(
      `Invalid UUID format returned from Hume API: ${newConfig.id}`,
      400,
      'INVALID_UUID'
    )
  }

  console.log('Created new config:', {
    id: newConfig.id,
    name: newConfig.name,
    version: newConfig.version
  })

  return newConfig
}

export async function deleteHumeConfig(configId: string): Promise<void> {
  console.log('Deleting Hume config:', configId)
  
  // Validate UUID format
  if (!isValidUUID(configId)) {
    throw new HumeApiError(
      `Invalid UUID format: ${configId}`,
      400,
      'INVALID_UUID'
    )
  }
  
  await fetchHume(`/configs/${configId}`, {
    method: 'DELETE',
  })

  console.log('Successfully deleted Hume config:', configId)
}

// UUID validation helper
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
