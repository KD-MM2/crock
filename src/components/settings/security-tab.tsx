import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { CurveName, SettingsState } from '@/types/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AlertNote from './alert-note';
import Field from './field';
import SectionHeading from './section-heading';
import ToggleField from './toggle-field';
import { UpdateDraft } from './types';

export default function SecurityTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionHeading icon={ShieldCheck} title={t('settings.advanced.security.title')} description={t('settings.advanced.security.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.advanced.security.fields.curve')}>
            <Select
              value={settings.security.curve ?? 'p256'}
              onValueChange={(value) =>
                updateDraft((draft) => {
                  draft.security.curve = value as CurveName;
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p256">p256</SelectItem>
                <SelectItem value="p521">p521</SelectItem>
                <SelectItem value="chacha20-curve25519">chacha20-curve25519</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <AlertNote icon={ShieldQuestion} text={t('settings.advanced.security.note')} />
      </div>

      <div className="space-y-4">
        <SectionHeading icon={ShieldCheck} title={t('settings.misc.security.title')} description={t('settings.misc.security.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.misc.security.deepLink.label')}
            description={t('settings.misc.security.deepLink.description')}
            checked={settings.advanced.deepLink ?? false}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.advanced.deepLink = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.misc.security.validate.label')}
            description={t('settings.misc.security.validate.description')}
            checked={settings.advanced.allowCodeFormatValidation ?? false}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.advanced.allowCodeFormatValidation = checked;
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
