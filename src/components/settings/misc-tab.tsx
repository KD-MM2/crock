import { SettingsState } from '@/types/settings';
import { Cpu, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import Field from './field';
import SectionHeading from './section-heading';
import ToggleField from './toggle-field';
import { UpdateDraft } from './types';

export default function MiscTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <SectionHeading icon={Cpu} title={t('settings.misc.logging.title')} description={t('settings.misc.logging.description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.misc.logging.fields.logTail')}>
          <Input
            type="number"
            min={10}
            value={settings.advanced.logTailLines}
            onChange={(event) =>
              updateDraft((draft) => {
                draft.advanced.logTailLines = Number(event.target.value) || 0;
              })
            }
          />
        </Field>
        <Field label={t('settings.misc.logging.fields.historyRetention')}>
          <Input
            type="number"
            min={1}
            value={settings.advanced.historyRetentionDays}
            onChange={(event) =>
              updateDraft((draft) => {
                draft.advanced.historyRetentionDays = Number(event.target.value) || 0;
              })
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <ToggleField
            label={t('settings.misc.logging.showLogs.label')}
            description={t('settings.misc.logging.showLogs.description')}
            checked={settings.advanced.showTransferLogs ?? true}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.advanced.showTransferLogs = checked;
              })
            }
          />
        </div>
      </div>

      <SectionHeading icon={ShieldAlert} title={t('settings.misc.security.title')} description={t('settings.misc.security.description')} />
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
          label={t('settings.misc.security.verbose.label')}
          description={t('settings.misc.security.verbose.description')}
          checked={settings.advanced.verboseLogs ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.verboseLogs = checked;
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

      <Field label={t('settings.misc.extraFlags.label')}>
        <Textarea
          rows={4}
          placeholder={t('settings.misc.extraFlags.placeholder')}
          value={settings.advanced.extraFlags ?? ''}
          onChange={(event) =>
            updateDraft((draft) => {
              draft.advanced.extraFlags = event.target.value || undefined;
            })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.misc.extraFlags.help')}</p>
      </Field>
    </div>
  );
}
