import { TOLEE_TYPE_REGISTRY } from '../registry';

export const FactoryModule = {
  config: TOLEE_TYPE_REGISTRY.factory,
  roles: TOLEE_TYPE_REGISTRY.factory.roles,
  features: TOLEE_TYPE_REGISTRY.factory.features,
  aiAssistant: TOLEE_TYPE_REGISTRY.factory.aiAssistant
};
