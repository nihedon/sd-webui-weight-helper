import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';

import * as context from '@/components/contexts/weight-helper-context';

const _metadataCacheStore: Record<
    string,
    {
        metadataState: context.MetadataState | undefined;
        selectedLoraBlockType: LoraBlockTypes;
        selectedModelType: ModelTypes;
        usingBlocks: Set<string> | undefined;
    }
> = {};

const _previewCacheStore: Record<string, context.PreviewState> = {};

/**
 * Retrieves the metadata cache for the given LoRA name.
 * @param loraName - The name of the LoRA model.
 * @returns The cached metadata state, selected block type, model type, and used blocks, or undefined if not cached.
 */
export function getMetadataCache(loraName: string):
    | {
          metadataState: context.MetadataState | undefined;
          selectedLoraBlockType: LoraBlockTypes;
          selectedModelType: ModelTypes;
          usingBlocks: Set<string> | undefined;
      }
    | undefined {
    return _metadataCacheStore[loraName];
}

/**
 * Sets the metadata cache for the given LoRA name.
 * @param loraName - The name of the LoRA model.
 * @param cache - The BasicState containing metadata and related info to cache.
 */
export function setMetadataCache(loraName: string, cache: context.BasicState) {
    _metadataCacheStore[loraName] = {
        metadataState: cache.metadataState,
        selectedLoraBlockType: cache.weightState.selectedLoraBlockType,
        selectedModelType: cache.weightState.selectedModelType,
        usingBlocks: cache.usingBlocks,
    };
}

/**
 * Retrieves the preview cache for the given LoRA name.
 * @param loraName - The name of the LoRA model.
 * @returns The cached PreviewState, or undefined if not cached.
 */
export function getPreviewCache(loraName: string): context.PreviewState | undefined {
    return _previewCacheStore[loraName];
}

/**
 * Sets the preview cache for the given LoRA name.
 * @param loraName - The name of the LoRA model.
 * @param cache - The PreviewState to cache.
 */
export function setPreviewCache(loraName: string, cache: context.PreviewState) {
    _previewCacheStore[loraName] = cache;
}
