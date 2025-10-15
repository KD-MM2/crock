import { getWindowApi } from '@/lib/window-api';
import { useSettingsStore } from '@/stores/settings';
import { ReleaseInfo } from '@/types/release';
import { SettingsState } from '@/types/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, FileCode2, Download, RefreshCw, FolderOpen, ShieldCheck } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import AlertNote from './alert-note';
import Field from './field';
import SectionHeading from './section-heading';
import crockLogo from '@/assets/crock.svg';

export default function AboutTab({ settings }: { settings: SettingsState }) {
  const installedVersion = settings.binary.crocVersion?.startsWith('v') ? settings.binary.crocVersion : undefined;
  const hasBinary = Boolean(settings.binary.crocPath);
  const [versions, setVersions] = useState<ReleaseInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(() => installedVersion);
  const { t } = useTranslation();

  const selectableVersions = useMemo(() => versions.filter((release) => !release.draft), [versions]);
  const versionItems = useMemo(() => {
    if (!selectedVersion || selectableVersions.some((release) => release.tagName === selectedVersion)) {
      return selectableVersions;
    }
    return [
      {
        tagName: selectedVersion,
        name: selectedVersion,
        prerelease: false,
        draft: false,
        immutable: false,
        publishedAt: undefined
      },
      ...selectableVersions
    ];
  }, [selectableVersions, selectedVersion]);

  const isSameAsInstalled = Boolean(selectedVersion && installedVersion && selectedVersion === installedVersion && hasBinary);
  const actionLabel = hasBinary ? t('settings.about.binary.actions.change') : t('settings.about.binary.actions.download');
  const selectValue = selectedVersion ?? '';

  useEffect(() => {
    let canceled = false;

    const loadVersions = async () => {
      setLoadingVersions(true);
      try {
        const data = await getWindowApi().croc.listVersions();
        if (canceled) return;
        setVersions(data);
        setSelectedVersion((current) => {
          if (current) return current;
          if (installedVersion) return installedVersion;
          const preferred = data.find((release) => !release.prerelease && !release.draft) ?? data[0];
          return preferred?.tagName;
        });
      } catch (error) {
        if (!canceled) {
          console.error('[settings] failed to load croc releases', error);
          toast.error(t('settings.about.toast.loadVersionsFailure'));
        }
      } finally {
        if (!canceled) {
          setLoadingVersions(false);
        }
      }
    };

    void loadVersions();

    return () => {
      canceled = true;
    };
  }, [installedVersion, t]);

  const handleRefreshVersion = async () => {
    try {
      const version = await getWindowApi().croc.getVersion();
      useSettingsStore.setState((state) => {
        if (!state.settings || !state.draft) return state;
        const nextSettings = {
          ...state.settings,
          binary: {
            ...state.settings.binary,
            crocVersion: version
          }
        };
        const nextDraft = {
          ...state.draft,
          binary: {
            ...state.draft.binary,
            crocVersion: version
          }
        };
        return { ...state, settings: nextSettings, draft: nextDraft, status: 'ready' };
      });
      setSelectedVersion((current) => current ?? (version.startsWith('v') ? version : current));
    } catch (error) {
      console.error('[settings] failed to refresh croc version', error);
      toast.error(t('settings.about.toast.checkVersionFailure'));
    }
  };

  const handleInstallVersion = async () => {
    if (!selectedVersion) return;
    setInstalling(true);
    try {
      const result = await getWindowApi().croc.installVersion(selectedVersion);
      useSettingsStore.setState({ settings: result.settings, draft: result.settings, status: 'ready' });
      setSelectedVersion(result.version);
      toast.success(t('settings.about.toast.installSuccess', { version: result.version }));
    } catch (error) {
      console.error('[settings] failed to install croc', error);
      toast.error(t('settings.about.toast.installFailure'));
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenBinaryFolder = async () => {
    if (settings.binary.crocPath) {
      await getWindowApi().app.openPath(settings.binary.crocPath);
    }
  };

  const handleSelectVersion = (value: string) => {
    setSelectedVersion(value === '__empty' ? undefined : value);
  };

  return (
    <div className="space-y-8 text-sm">
      <div className="space-y-4">
        <SectionHeading icon={Info} title={t('settings.about.app.title')} description={t('settings.about.app.description')} />
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-background/40 p-4">
          <img src={crockLogo} alt={t('settings.about.app.logoAlt')} className="h-14 w-14" />
          <div className="space-y-1">
            <p className="text-base font-semibold leading-none text-foreground">{t('settings.about.app.tagline')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.about.app.uiVersion', { version: '0.1.0' })}</p>
          </div>
        </div>
        <p>
          <Trans
            t={t}
            i18nKey="settings.about.app.basedOn"
            components={{
              crocLink: (
                <a className="underline" href="https://github.com/schollz/croc" target="_blank" rel="noreferrer">
                  croc
                </a>
              ),
              repoLink: (
                <a className="underline" href="https://github.com/KD-MM2/crock" target="_blank" rel="noreferrer">
                  KD-MM2/crock
                </a>
              )
            }}
          />
        </p>
        <p>
          <Trans
            t={t}
            i18nKey="settings.about.app.repository"
            components={{
              repoLink: (
                <a className="underline" href="https://github.com/KD-MM2/crock" target="_blank" rel="noreferrer">
                  KD-MM2/crock
                </a>
              )
            }}
          />
        </p>
        <p>
          <Trans
            t={t}
            i18nKey="settings.about.app.feedback"
            components={{
              repoLink: (
                <a className="underline" href="https://github.com/KD-MM2/crock" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              )
            }}
          />
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeading icon={FileCode2} title={t('settings.about.binary.title')} description={t('settings.about.binary.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.about.binary.fields.version')}>
            <Select value={selectValue} onValueChange={handleSelectVersion} disabled={loadingVersions || installing}>
              <SelectTrigger className="w-full" aria-label={t('settings.about.binary.fields.versionAria')}>
                <SelectValue placeholder={loadingVersions ? t('common.loadingShort') : t('settings.about.binary.fields.versionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {versionItems.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    {loadingVersions ? t('common.loadingShort') : t('settings.about.binary.fields.versionEmpty')}
                  </SelectItem>
                ) : (
                  versionItems.map((release) => {
                    const statusLabels: string[] = [];
                    if (release.prerelease) statusLabels.push(t('settings.about.binary.labels.preRelease'));
                    if (release.immutable) statusLabels.push(t('settings.about.binary.labels.immutable'));
                    const statusSuffix = statusLabels.length > 0 ? ` (${statusLabels.join(' • ')})` : '';

                    return (
                      <SelectItem key={release.tagName} value={release.tagName} className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {t('settings.about.binary.labels.releaseTitle', {
                            version: release.tagName,
                            status: statusSuffix
                          })}
                        </span>
                        {release.publishedAt ? (
                          <span className="text-xs text-muted-foreground">
                            {t('settings.about.binary.labels.publishedAt', { date: new Date(release.publishedAt).toLocaleDateString() })}
                          </span>
                        ) : null}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.about.binary.current', { version: settings.binary.crocVersion ?? t('settings.about.binary.labels.notInstalled') })}
            </p>
          </Field>
          <Field label={t('settings.about.binary.fields.path')}>
            <Input value={settings.binary.crocPath ?? ''} readOnly className="font-mono" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void handleInstallVersion()}
            disabled={!selectedVersion || installing || loadingVersions || isSameAsInstalled}
          >
            {installing ? <Spinner className="mr-2 size-4 animate-spin" aria-hidden /> : <Download className="mr-2 size-4" aria-hidden />}
            {installing ? t('settings.about.binary.actions.installing') : actionLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleRefreshVersion()} disabled={installing}>
            <RefreshCw className="mr-2 size-4" aria-hidden /> {t('settings.about.binary.actions.checkVersion')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleOpenBinaryFolder()} disabled={!settings.binary.crocPath}>
            <FolderOpen className="mr-2 size-4" aria-hidden /> {t('settings.about.binary.actions.openFolder')}
          </Button>
        </div>
        {isSameAsInstalled ? <AlertNote icon={ShieldCheck} text={t('settings.about.binary.notes.current')} /> : null}
      </div>
    </div>
  );
}
