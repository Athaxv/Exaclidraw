const DEFAULT_BACKEND_URL = "https://exaclidraw-4.onrender.com";
const DEFAULT_WS_URL = "https://exaclidraw-5.onrender.com";

const resolvedBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || DEFAULT_BACKEND_URL;
const resolvedWsUrl =
  process.env.NEXT_PUBLIC_WS_URL?.trim() || DEFAULT_WS_URL;

export const HTTP_BACKEND = resolvedBackendUrl;
export const BACKEND_URL = resolvedBackendUrl;
export const WS_URL = resolvedWsUrl;