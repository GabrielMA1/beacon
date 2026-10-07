interface ImportMetaEnv {
  /**
   * Optional. Public URL of the model catalog (GET /api/models).
   * Read at build time only; when unset or unreachable the bundled sample is used.
   */
  readonly PUBLIC_MODELS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
