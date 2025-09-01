import * as historyManager from '@/shared/manager/history-manager';
import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';
import { getPreset } from '@/shared/utils/common-utils';
import { getOutputStrings, updateEditor } from '@/shared/utils/editor-utils';

// Type definitions migrated from former context-based implementation
export interface BasicState {
    loraName: string;
    metadataState: MetadataState | undefined;
    srcLoraParams: string;
    weightState: WeightState;
    blockGroups: string[][];
    preset: string;
    lbwPresets: Record<string, string>;
    usingBlocks: Set<string> | undefined;
    uiState: UiState;
    lock: boolean;
    historyIndex: number;
    previewState: PreviewState;
}

export interface MetadataState {
    baseModel: string;
    modelType: string;
    algorithm: string;
}

export interface WeightState {
    selectedModelType: ModelTypes;
    selectedLoraBlockType: LoraBlockTypes;
    weights: Record<string, WeightControlState>;
    lbwe: string;
    xyzMode: boolean;
}

export interface WeightControlState {
    initValue: number;
    value: number;
    sliderMin: number;
    sliderMax: number;
    initCheckState?: boolean | undefined;
    checkState?: boolean | undefined;
}

export interface UiState {
    isVisible: boolean;
    scale: number;
    isMoreButtonVisible: boolean;
    isWaiting: boolean;
}

export interface PreviewState {
    modelId: string;
    triggerWords: string[];
    negativeTriggerWords: string[];
    modelName: string;
    thumbUrl: string;
    hasMetadata: boolean;
    description: string;
    isDescriptionVisible: boolean;
    isTagInsertButtonVisible: boolean;
}

// Global mutable state (single source of truth outside of position which is applied directly to DOM)
let globalState: BasicState;

// Callbacks for full state changes (require template re-render)
const stateChangeCallbacks: Array<(state: BasicState) => void> = [];
// Callbacks for position-only changes (avoid full re-render; DOM style mutation only)
const positionChangeCallbacks: Array<(pos: { top: number; left: number }) => void> = [];

// Notify subscribers about a full state change
function notifyStateChange(): void {
    stateChangeCallbacks.forEach((callback) => callback(globalState));
}

// Notify subscribers about position-only change
function notifyPositionChange(pos: { top: number; left: number }): void {
    positionChangeCallbacks.forEach((callback) => callback(pos));
}

/**
 * Subscribe to full state changes.
 * @param callback invoked whenever global state mutates.
 * @returns unsubscribe function
 */
export function subscribeToStateChanges(callback: (state: BasicState) => void): () => void {
    stateChangeCallbacks.push(callback);
    return () => {
        const index = stateChangeCallbacks.indexOf(callback);
        if (index > -1) {
            stateChangeCallbacks.splice(index, 1);
        }
    };
}

/**
 * Subscribe to position-only changes (top/left) used for dragging the UI.
 * @param callback invoked with new {top,left}
 * @returns unsubscribe function
 */
export function subscribeToPositionChanges(callback: (pos: { top: number; left: number }) => void): () => void {
    positionChangeCallbacks.push(callback);
    return () => {
        const index = positionChangeCallbacks.indexOf(callback);
        if (index > -1) {
            positionChangeCallbacks.splice(index, 1);
        }
    };
}

/** Get current global state snapshot (do not mutate directly). */
export function getGlobalState(): BasicState {
    return globalState;
}

/** Initialize state (triggers initial render). */
export function initializeGlobalState(initialState: BasicState): void {
    globalState = initialState;
    notifyStateChange();
}

// OPEN_CONTEXT
export function openContext(payload: BasicState): void {
    globalState = payload;
    notifyStateChange();
}

// CLOSE_CONTEXT
export function closeContext(payload: BasicState): void {
    globalState = payload;
    notifyStateChange();
}

// SET_POSITION (excluded from main state to avoid re-render on drag)
export function setPosition(top: number, left: number): void {
    // Don't persist in state; this is transient UI positioning.
    notifyPositionChange({ top, left });
}

// LOAD_METADATA
export function loadMetadata(payload: {
    algorithm: string;
    baseModel: string;
    modelType: string;
    selectedModelType: ModelTypes;
    usingBlocks: string[] | null | undefined;
    blockGroups: string[][];
    weights: Record<string, WeightControlState>;
    lbwPresets: Record<string, string>;
}): void {
    const newState = {
        ...globalState,
        metadataState: {
            ...globalState.metadataState,
            algorithm: payload.algorithm || 'Unknown',
            baseModel: payload.baseModel || 'Unknown',
            modelType: payload.modelType || 'Unknown',
        },
        weightState: {
            ...globalState.weightState,
            selectedModelType: payload.selectedModelType,
            weights: payload.weights,
        },
        blockGroups: payload.blockGroups,
        lbwPresets: payload.lbwPresets,
        uiState: {
            ...globalState.uiState,
            isWaiting: false,
        },
    };
    if (payload.usingBlocks === null) {
        newState.usingBlocks = undefined;
    } else if (payload.usingBlocks) {
        newState.usingBlocks = new Set(payload.usingBlocks);
    }
    globalState = newState;
    notifyStateChange();
}

// SET_WAITING
export function setWaiting(isWaiting: boolean): void {
    globalState = {
        ...globalState,
        uiState: {
            ...globalState.uiState,
            isWaiting: isWaiting,
        },
    };
    notifyStateChange();
}

// SET_MODELINFO
export function setModelInfo(payload: {
    selectedModelType: ModelTypes;
    selectedLoraBlockType: LoraBlockTypes;
    blockGroups: string[][];
    lbwPresets: Record<string, string>;
    weights: Record<string, WeightControlState>;
}): void {
    const newState = {
        ...globalState,
        weightState: {
            ...globalState.weightState,
            selectedLoraBlockType: payload.selectedLoraBlockType,
            selectedModelType: payload.selectedModelType,
            weights: payload.weights,
        },
        blockGroups: payload.blockGroups,
        lbwPresets: payload.lbwPresets,
    };
    if (!opts.weight_helper_using_execCommand) {
        updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
    }
    globalState = newState;
    notifyStateChange();
}

// TOGGLE_XYZ_MODE
export function toggleXyzMode(): void {
    const newState = {
        ...globalState,
        weightState: {
            ...globalState.weightState,
            xyzMode: !globalState.weightState.xyzMode,
        },
    };
    if (!opts.weight_helper_using_execCommand) {
        updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
    }
    globalState = newState;
    notifyStateChange();
}

// SET_PRESET
export function setPreset(payload: { weights: Record<string, WeightControlState>; preset: string }): void {
    const weightState = {
        ...globalState.weightState,
        weights: {
            ...globalState.weightState.weights,
            ...payload.weights,
        },
    };
    const outputStrings = getOutputStrings(globalState.loraName, weightState);
    const locked = historyManager.isLocked(globalState.loraName, outputStrings.loraParams);

    const newState = {
        ...globalState,
        weightState: weightState,
        preset: payload.preset,
        lock: locked,
    };
    if (!opts.weight_helper_using_execCommand) {
        updateEditor(outputStrings.loraDefine);
    }
    globalState = newState;
    notifyStateChange();
}

// TOGGLE_LOCK_STATUS
export function toggleLockStatus(): void {
    const outputLoraParams = getOutputStrings(globalState.loraName, globalState.weightState).loraParams;
    const locked = historyManager.isLocked(globalState.loraName, outputLoraParams);
    if (locked) {
        historyManager.removeLock(globalState.loraName, outputLoraParams);
    } else {
        historyManager.addLock(globalState.loraName, outputLoraParams);
    }
    globalState = {
        ...globalState,
        lock: !locked,
    };
    notifyStateChange();
}

// SET_HISTORY
export function setHistory(payload: {
    historyIndex: number;
    weightState: {
        selectedModelType: ModelTypes;
        selectedLoraBlockType: LoraBlockTypes;
        weights: Record<string, WeightControlState>;
        lbwe: string;
        xyzMode: boolean;
    };
    preset: string;
    locked: boolean;
}): void {
    const { locked, historyIndex, preset } = payload;
    const { selectedLoraBlockType, selectedModelType, weights, lbwe, xyzMode } = payload.weightState;
    const weightState = {
        ...globalState.weightState,
        weights: {
            ...globalState.weightState.weights,
            ...weights,
        },
        selectedLoraBlockType: selectedLoraBlockType,
        selectedModelType: selectedModelType,
        lbwe: lbwe,
        xyzMode: xyzMode,
    };
    const newState = {
        ...globalState,
        historyIndex: historyIndex,
        preset: preset,
        weightState: weightState,
        lock: locked,
    };
    if (!opts.weight_helper_using_execCommand) {
        updateEditor(getOutputStrings(newState.loraName, newState.weightState).loraDefine);
    }
    globalState = newState;
    notifyStateChange();
}

// SET_HISTORY_INDEX
export function setHistoryIndex(historyIndex: number): void {
    globalState = {
        ...globalState,
        historyIndex: historyIndex,
    };
    notifyStateChange();
}

// SET_WEIGHT
export function setWeight(payload: { block: string; value: number; checkState?: boolean }): void {
    globalState.weightState.xyzMode = false;
    const weights = {
        ...globalState.weightState.weights,
        [payload.block]: {
            ...globalState.weightState.weights[payload.block],
            value: payload.value,
            sliderMin: Math.min(payload.value, globalState.weightState.weights[payload.block].sliderMin),
            sliderMax: Math.max(payload.value, globalState.weightState.weights[payload.block].sliderMax),
            checkState: payload.checkState,
        },
    };
    const weightState = {
        ...globalState.weightState,
        weights,
        xyzMode: false,
    };

    const outputStrings = getOutputStrings(globalState.loraName, weightState);
    const locked = historyManager.isLocked(globalState.loraName, outputStrings.loraParams);

    const newState = {
        ...globalState,
        weightState: weightState,
        preset: getPreset(globalState.weightState.selectedModelType, globalState.weightState.selectedLoraBlockType, globalState.lbwPresets, weights),
        lock: locked,
    };
    if (!opts.weight_helper_using_execCommand) {
        updateEditor(outputStrings.loraDefine);
    }
    globalState = newState;
    notifyStateChange();
}

// HIDE_MORE_BUTTON
export function hideMoreButton(): void {
    globalState = {
        ...globalState,
        uiState: {
            ...globalState.uiState,
            isMoreButtonVisible: false,
        },
    };
    notifyStateChange();
}

// CLEAR_HISTORY
export function clearHistory(): void {
    historyManager.clearHistories(globalState.loraName);
    if (!globalState.weightState.xyzMode) {
        historyManager.addHistory(globalState.loraName, {
            loraParams: getOutputStrings(globalState.loraName, globalState.weightState).loraParams,
            ...globalState.weightState,
        });
    }
    const historyIndex = historyManager.getHistories(globalState.loraName).length - 1;
    globalState = {
        ...globalState,
        historyIndex: historyIndex < 0 ? 0 : historyIndex,
    };
    notifyStateChange();
}

// LOAD_PREVIEW_DATA
export function loadPreviewData(payload: PreviewState): void {
    globalState = {
        ...globalState,
        previewState: payload,
    };
    notifyStateChange();
}

// SET_PREVIEW_DESCRIPTION_VISIBLE
export function setPreviewDescriptionVisible(isVisible: boolean): void {
    globalState = {
        ...globalState,
        previewState: {
            ...globalState.previewState,
            isDescriptionVisible: isVisible,
        },
    };
    notifyStateChange();
}

// HIDE_TAG_INSERT_BUTTON
export function hideTagInsertButton(): void {
    globalState = {
        ...globalState,
        previewState: {
            ...globalState.previewState,
            isTagInsertButtonVisible: false,
        },
    };
    notifyStateChange();
}
