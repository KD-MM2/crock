import { Cpu, FileCode2, Globe, Info, ShieldCheck } from 'lucide-react';

const TAB_ITEMS = [
  { value: 'general', labelKey: 'settings.tabs.general', icon: Info },
  { value: 'network', labelKey: 'settings.tabs.network', icon: Globe },
  { value: 'security', labelKey: 'settings.tabs.security', icon: ShieldCheck },
  { value: 'advanced', labelKey: 'settings.tabs.advanced', icon: Cpu },
  { value: 'about', labelKey: 'settings.tabs.about', icon: FileCode2 }
] as const;

export { TAB_ITEMS };
