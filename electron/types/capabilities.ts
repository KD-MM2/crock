export type CrocCapabilities = {
  socks5?: boolean;
  curve?: boolean;
  throttleUpload?: boolean;
  internalDns?: boolean;
  local?: boolean;
  relay6?: boolean;
  out?: boolean;
  text?: boolean;
  exclude?: boolean;
  overwrite?: boolean;
  yes?: boolean;
  /** Croc accepts the custom code phrase via the CROC_SECRET env var (required on Unix since v9.x). */
  crocSecretEnv?: boolean;
  /** --zip (send): zip folders before sending. */
  zip?: boolean;
  /** --git (send): respect .gitignore. */
  git?: boolean;
  /** --hash (send): choose hash algorithm. */
  hash?: boolean;
  /** --no-local (send): disable local relay discovery. */
  noLocal?: boolean;
  /** --no-multi (send): disable multiplexed transfers. */
  noMulti?: boolean;
  /** --connect: route the relay connection through an HTTP proxy. */
  connect?: boolean;
  /** --exclude-file (send, croc >= v11): exact relative-path exclusions. */
  excludeFile?: boolean;
  /** --transport (send, croc >= v11): auto/derp/relay data transport. */
  transport?: boolean;
  /** --store (send, croc >= v11): upload encrypted files for later download. */
  store?: boolean;
  /** --rename (receive, croc >= v11): receive existing files under new names. */
  rename?: boolean;
};
