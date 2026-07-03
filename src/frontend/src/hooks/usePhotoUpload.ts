import { useAuth } from "@/hooks/useAuth";
import { loadConfig } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { useCallback, useRef, useState } from "react";

/**
 * Uploads a resized JPEG Blob to the object-storage canister via the real
 * @caffeineai/object-storage `StorageClient` and returns a durable,
 * refresh-safe gateway URL (NOT a browser blob: URL).
 *
 * The StorageClient is built lazily on the first upload using `loadConfig()`
 * from @caffeineai/core-infrastructure and a fresh `HttpAgent` constructed
 * with the identity from `useAuth()` — mirroring how `createActorWithConfig`
 * builds its agent in core-infrastructure (host: config.backend_host, identity
 * passed through, rootKey fetched when host is localhost). The client is
 * memoized per-identity in a ref so it is constructed at most once per
 * identity, not on every render or every upload.
 *
 * Public API is intentionally kept stable so PhotoField.tsx works unchanged:
 *   { uploadPhoto(blob: Blob): Promise<string>,
 *     isUploading: boolean,
 *     error: string | null,
 *     reset(): void }
 */

export interface UsePhotoUpload {
  uploadPhoto: (blob: Blob) => Promise<string>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

interface ClientEntry {
  identity: Identity | undefined;
  client: StorageClient;
}

export function usePhotoUpload(): UsePhotoUpload {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<ClientEntry | null>(null);
  const { identity } = useAuth();

  const reset = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Builds (and memoizes) a StorageClient for the current identity. Rebuilds
   * when the identity changes so a login/logout picks up the new identity.
   * Throws on config/agent construction failure so the caller can surface it
   * via the existing error state.
   */
  const getStorageClient = useCallback(async (): Promise<StorageClient> => {
    const cached = clientRef.current;
    if (cached && cached.identity === identity) {
      return cached.client;
    }

    const config = await loadConfig();

    const agent = new HttpAgent({
      host: config.backend_host,
      ...(identity ? { identity } : {}),
    });

    if (config.backend_host?.includes("localhost")) {
      await agent.fetchRootKey().catch((err) => {
        console.warn(
          "Unable to fetch root key. Check to ensure that your local replica is running",
        );
        console.error(err);
      });
    }

    const client = new StorageClient(
      config.bucket_name,
      config.storage_gateway_url,
      config.backend_canister_id,
      config.project_id,
      agent,
    );

    clientRef.current = { identity, client };
    return client;
  }, [identity]);

  const uploadPhoto = useCallback(
    async (blob: Blob): Promise<string> => {
      setError(null);
      setIsUploading(true);

      try {
        const storageClient = await getStorageClient();

        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        const { hash } = await storageClient.putFile(bytes);
        if (!hash) {
          throw new Error("Upload succeeded but no blob hash was returned.");
        }

        const url = await storageClient.getDirectURL(hash);
        if (!url) {
          throw new Error("Upload succeeded but no servable URL was returned.");
        }
        return url;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown upload error.";
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [getStorageClient],
  );

  return { uploadPhoto, isUploading, error, reset };
}
