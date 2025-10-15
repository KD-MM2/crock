import { CurveName, SettingsState } from '@/types/settings';
import { ReceiveFormState } from '@/types/transfer-ui';

function buildInitialReceiveForm(settings?: SettingsState | null): ReceiveFormState {
  return {
    code: '',
    autoPaste: false,
    sessionOverrides: {},
    options: {
      overwrite: settings?.transferDefaults.receive.overwrite ?? false,
      autoConfirm: settings?.transferDefaults.receive.yes ?? false
    }
  };
}

function resolveRelay(overrides: ReceiveFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  const overrideRelay = overrides.relay?.trim();
  if (overrideRelay) return overrideRelay;
  return resolveDefaultRelay(settings);
}

function resolveRelayPass(overrides: ReceiveFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  if (overrides.pass !== undefined) {
    const trimmed = overrides.pass.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return resolveDefaultRelayPass(settings);
}

function resolveDefaultRelay(settings?: SettingsState | null): string | undefined {
  const host = settings?.relayProxy.defaultRelay.host?.trim();
  return host && host.length > 0 ? host : undefined;
}

function resolveDefaultRelayPass(settings?: SettingsState | null): string | undefined {
  const pass = settings?.relayProxy.defaultRelay.pass?.trim();
  return pass && pass.length > 0 ? pass : undefined;
}

function resolveSecurityCurve(settings?: SettingsState | null): CurveName | undefined {
  return settings?.security.curve;
}

function quoteCliArg(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return value;
  if (!normalized.includes(' ') && !normalized.includes('"')) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '\\"')}"`;
}

export { buildInitialReceiveForm, resolveRelay, resolveRelayPass, resolveDefaultRelay, resolveDefaultRelayPass, resolveSecurityCurve, quoteCliArg };
