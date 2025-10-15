import { Cpu, FileCode2, Globe, Info } from 'lucide-react';

const TAB_ITEMS = [
  { value: 'general', labelKey: 'settings.tabs.general', icon: Info },
  { value: 'advanced', labelKey: 'settings.tabs.advanced', icon: Globe },
  { value: 'misc', labelKey: 'settings.tabs.misc', icon: Cpu },
  { value: 'about', labelKey: 'settings.tabs.about', icon: FileCode2 }
] as const;

export { TAB_ITEMS };
