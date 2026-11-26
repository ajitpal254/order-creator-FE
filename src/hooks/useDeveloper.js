import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  asList,
  developerApi,
  developerKeys,
  unwrapDeveloperData,
} from '../api/developer';

// Developer data hooks (v1.0 F1), following the TanStack Query pattern of
// useAddresses/useCompanies: reads unwrap the { success, data } envelope,
// mutations invalidate the developer keys so lists refetch fresh data.

export function useApiKeys() {
  return useQuery({
    queryKey: developerKeys.apiKeys,
    queryFn: async () => asList(await developerApi.listKeys()),
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: developerKeys.webhooks,
    queryFn: async () => asList(await developerApi.listWebhooks()),
  });
}

// Delivery log for one subscription. Only fetched while the viewer is
// open for that subscription (enabled flag).
export function useWebhookDeliveries(webhookId, enabled = true) {
  return useQuery({
    queryKey: developerKeys.deliveries(webhookId),
    enabled: Boolean(webhookId) && enabled,
    queryFn: async () => asList(await developerApi.listDeliveries(webhookId)),
  });
}

function useDeveloperMutation(mutationFn, keys) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });
}

export function useCreateApiKey() {
  // The create response carries the plaintext key ONCE — return it
  // unwrapped so the caller can show it in the one-time callout.
  return useDeveloperMutation(
    async (payload) => unwrapDeveloperData(await developerApi.createKey(payload)),
    [developerKeys.apiKeys]
  );
}

export function useRevokeApiKey() {
  return useDeveloperMutation((id) => developerApi.revokeKey(id), [
    developerKeys.apiKeys,
  ]);
}

export function useCreateWebhook() {
  // The create response carries the signing secret ONCE — return it
  // unwrapped so the caller can show it in the one-time callout.
  return useDeveloperMutation(
    async (payload) => unwrapDeveloperData(await developerApi.createWebhook(payload)),
    [developerKeys.webhooks]
  );
}

export function useDeleteWebhook() {
  return useDeveloperMutation((id) => developerApi.deleteWebhook(id), [
    developerKeys.webhooks,
  ]);
}
