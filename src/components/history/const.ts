const statusLabelKeys: Record<string, string> = {
  'in-progress': 'history.statuses.in-progress',
  connecting: 'history.statuses.connecting',
  sending: 'history.statuses.sending',
  receiving: 'history.statuses.receiving',
  done: 'history.statuses.done',
  failed: 'history.statuses.failed',
  canceled: 'history.statuses.canceled'
};

const typeLabelKeys: Record<string, string> = {
  send: 'history.types.send',
  receive: 'history.types.receive'
};

export { statusLabelKeys, typeLabelKeys };
