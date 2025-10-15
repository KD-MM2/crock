import { getWindowApi } from '@/lib/window-api';
import { SettingsState } from '@/types/settings';
import { FolderOpen, ClipboardCopy, Waypoints, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import Field from './field';
import SectionHeading from './section-heading';
import ToggleField from './toggle-field';
import { UpdateDraft } from './types';

export default function GeneralTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const api = getWindowApi();
  const excludeText = settings.transferDefaults.send.exclude.join('\n');
  const { t } = useTranslation();

  const handleSelectFolder = async () => {
    const folder = await api.app.selectFolder();
    if (folder) {
      updateDraft((draft) => {
        draft.general.downloadDir = folder;
      });
    }
  };

  const handleCopyDownloadPath = async () => {
    await api.app.clipboardWrite(settings.general.downloadDir);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SectionHeading icon={FolderOpen} title={t('settings.general.download.title')} description={t('settings.general.download.description')} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <Input value={settings.general.downloadDir} readOnly className="font-mono" />
          <Button variant="outline" size="sm" onClick={() => void handleSelectFolder()}>
            <FolderOpen className="mr-2 size-4" aria-hidden /> {t('settings.general.download.selectFolder')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleCopyDownloadPath()}>
            <ClipboardCopy className="mr-2 size-4" aria-hidden /> {t('common.actions.copy')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading icon={Waypoints} title={t('settings.general.behavior.title')} description={t('settings.general.behavior.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.behavior.autoOpen.label')}
            description={t('settings.general.behavior.autoOpen.description')}
            checked={settings.general.autoOpenOnDone}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoOpenOnDone = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.behavior.autoCopy.label')}
            description={t('settings.general.behavior.autoCopy.description')}
            checked={settings.general.autoCopyCodeOnSend}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoCopyCodeOnSend = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.behavior.autoResetSuccess.label')}
            description={t('settings.general.behavior.autoResetSuccess.description')}
            checked={settings.general.autoResetOnSendSuccess}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoResetOnSendSuccess = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.behavior.autoResetFailure.label')}
            description={t('settings.general.behavior.autoResetFailure.description')}
            checked={settings.general.autoResetOnSendFailure}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoResetOnSendFailure = checked;
              })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading
          icon={Download}
          title={t('settings.general.sendDefaults.title')}
          description={t('settings.general.sendDefaults.description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.sendDefaults.noCompress.label')}
            description={t('settings.general.sendDefaults.noCompress.description')}
            checked={settings.transferDefaults.send.noCompress}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.send.noCompress = checked;
              })
            }
          />
        </div>
        <Field label={t('settings.general.sendDefaults.exclude.label')}>
          <Textarea
            value={excludeText}
            placeholder={t('settings.general.sendDefaults.exclude.placeholder')}
            rows={4}
            onChange={(event) =>
              updateDraft((draft) => {
                const patterns = event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean);
                draft.transferDefaults.send.exclude = patterns;
              })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('settings.general.sendDefaults.exclude.help')}</p>
        </Field>
      </div>

      <div className="space-y-4">
        <SectionHeading
          icon={Download}
          title={t('settings.general.receiveDefaults.title')}
          description={t('settings.general.receiveDefaults.description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.receiveDefaults.overwrite.label')}
            description={t('settings.general.receiveDefaults.overwrite.description')}
            checked={settings.transferDefaults.receive.overwrite}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.receive.overwrite = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.receiveDefaults.yes.label')}
            description={t('settings.general.receiveDefaults.yes.description')}
            checked={settings.transferDefaults.receive.yes}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.receive.yes = checked;
              })
            }
          />
          <Field label={t('settings.general.receiveDefaults.defaultDir')}>
            <Input value={settings.general.downloadDir} readOnly className="font-mono" />
          </Field>
        </div>
      </div>
    </div>
  );
}
