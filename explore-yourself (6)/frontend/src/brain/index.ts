import { auth } from "app/auth";
import { API_HOST, API_PATH, API_PREFIX_PATH } from "../constants";
import { Brain } from "./Brain";
import type { RequestParams } from "./http-client";

const isLocalhost = /localhost:\d{4}/i.test(window.location.origin);

const constructBaseUrl = (): string => {
  if (isLocalhost) {
    // In workspace (dev)
    return `${window.location.origin}${API_PATH}`;
  }

  if (API_HOST && API_PREFIX_PATH) {
    // In deployed app (prod)
    return `https://${API_HOST}${API_PREFIX_PATH}`;
  }

  // In deployed app (prod) - use relative path
  return `${window.location.origin}${API_PATH}`;
};

type BaseApiParams = Omit<RequestParams, "signal" | "baseUrl" | "cancelToken">;

const constructBaseApiParams = (): BaseApiParams => {
  return {
    credentials: "include",
    secure: true,
  };
};

const constructClient = () => {
  const baseUrl = constructBaseUrl();
  const baseApiParams = constructBaseApiParams();

  const sanitizePathname = (pathname: string) =>
    pathname
      .replace(/\/api\/+routes\//, "/api/")
      .replace(/\/{2,}/g, "/");

  const normalizeTarget = (input: RequestInfo | URL): string | null => {
    if (typeof input === "string" || input instanceof URL) {
      try {
        const url = typeof input === "string"
          ? new URL(input, window.location.origin)
          : new URL(input.toString());

        const normalizedPath = sanitizePathname(url.pathname);
        if (normalizedPath !== url.pathname) {
          url.pathname = normalizedPath;
          return url.toString();
        }
      } catch {
        const fallback = sanitizePathname(typeof input === "string" ? input : input.toString());
        if (fallback !== (typeof input === "string" ? input : input.toString())) {
          return fallback;
        }
      }
    }

    return null;
  };

  return new Brain({
    baseUrl,
    baseApiParams,
    customFetch: (input, init) => {
      if (API_HOST && API_HOST !== "api.databutton.com") {
        const normalized = normalizeTarget(input);
        if (normalized) {
          return fetch(normalized, init);
        }
      }

      return fetch(input, init);
    },
    securityWorker: async () => {
      return {
        headers: {
          Authorization: await auth.getAuthHeaderValue(),
        },
      };
    },
  });
};

const brain = constructClient();

export default brain;
