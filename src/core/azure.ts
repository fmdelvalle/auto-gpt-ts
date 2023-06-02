import { IAzureConfig, IRunParameters } from "../types";
import yaml from "yaml";
import fs from "fs";

export function getAzureDeploymentIdForModel(cfg: IRunParameters, model: string): string {
    if( !cfg.azure) { 
        throw new Error("Azure config not set");
    }

  if (model === cfg.llm.models.fast_llm_model) {
    return cfg.azure.azure_model_to_deployment_id_map["fast_llm_model_deployment_id"];
  } else if (model === cfg.llm.models.smart_llm_model) {
    return cfg.azure.azure_model_to_deployment_id_map["smart_llm_model_deployment_id"];
  } else if (model === "text-embedding-ada-002") {
    return cfg.azure.azure_model_to_deployment_id_map["embedding_model_deployment_id"];
  } else {
    return "";
  }
}

  
export function loadAzureConfig(config_file: string): IAzureConfig {
    const configParams = yaml.parse(fs.readFileSync(config_file, 'utf8'));
    const azureConfig: IAzureConfig = {
      openai_api_type: configParams.azure_api_type || 'azure',
      openai_api_base: configParams.azure_api_base || '',
      openai_api_version: configParams.azure_api_version || '2023-03-15-preview',
      azure_model_to_deployment_id_map: configParams.azure_model_map || {},
    };
    return azureConfig;
}