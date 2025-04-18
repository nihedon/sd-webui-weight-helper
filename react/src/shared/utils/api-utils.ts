import { ModelTypes } from '@/shared/types/lora-types';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * Fetches metadata for the specified LoRA model from the backend API.
 * @param loraName - The name of the LoRA model.
 * @param force - Whether to force a refresh of the metadata regardless of cache.
 * @param signal - Optional AbortSignal for canceling the request.
 * @returns A promise resolving to the metadata object.
 */
export async function fetchMetadata(
    loraName: string,
    force: boolean,
    signal?: AbortSignal,
): Promise<{ algorithm: string; baseModel: string; modelType: ModelTypes; usingBlocks: string[] | null }> {
    const res = await fetch(`/whapi/v1/get_metadata?key=${encodeURIComponent(loraName)}&force=${force}`, {
        method: 'POST',
        signal: signal,
    });
    if (!res.ok) {
        throw new Error(`Failed to set up API endpoints. Please reload the page.: ${res.status}`);
    }
    return await res.json();
}

/**
 * Fetches preview information for the specified LoRA model from the backend API.
 * @param loraName - The name of the LoRA model.
 * @param signal - Optional AbortSignal for canceling the request.
 * @returns A promise resolving to the PreviewState object.
 */
export async function fetchPreviewData(loraName: string, signal?: AbortSignal): Promise<context.PreviewState> {
    const res = await fetch(`/whapi/v1/get_preview_info?key=${encodeURIComponent(loraName)}`, {
        method: 'POST',
        signal: signal,
    });
    if (!res.ok) {
        throw new Error(`Failed to set up API endpoints. Please reload the page.: ${res.status}`);
    }
    const json = await res.json();
    return {
        ...json,
        isDescriptionVisible: false,
        isTagInsertButtonVisible: true,
    };
}
