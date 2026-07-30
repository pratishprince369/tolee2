import { TOLEE_TYPE_REGISTRY } from '../registry';

export const CoachingClassModule = {
  config: TOLEE_TYPE_REGISTRY.coaching_class,
  roles: TOLEE_TYPE_REGISTRY.coaching_class?.roles || [],
  features: TOLEE_TYPE_REGISTRY.coaching_class?.features || [],
  aiAssistant: TOLEE_TYPE_REGISTRY.coaching_class?.aiAssistant
};
