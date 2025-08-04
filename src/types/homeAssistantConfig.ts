export interface HomeAssistantConfig {
  id: number;
  base_url: string;
  access_token: string;
  entity_prefix?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHomeAssistantConfig {
  base_url: string;
  access_token: string;
  entity_prefix?: string;
}

export interface UpdateHomeAssistantConfig {
  base_url?: string;
  access_token?: string;
  entity_prefix?: string;
} 