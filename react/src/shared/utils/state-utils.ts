import { CARD_NO_IMAGE_PATH, SELECTABLE_LORA_BLOCK_TYPES, SELECTABLE_MODEL_TYPES } from '@/shared/constants/common-const';
import * as cacheManager from '@/shared/manager/cache-manager';
import * as configManager from '@/shared/manager/config-manager';
import * as historyManager from '@/shared/manager/history-manager';
import * as currentState from '@/shared/state/current-state';
import * as loraTypes from '@/shared/types/lora-types';
import { LoraDefineParams, WeightControllerTypes } from '@/shared/types/lora-types';
import { getPreset } from '@/shared/utils/common-utils';
import { getOutputStrings } from '@/shared/utils/editor-utils';

import * as context from '@/components/contexts/weight-helper-context';

/**
 * Creates and returns the initial state for the Weight Helper UI.
 * @returns The initial BasicState object for the Weight Helper.
 */
export function createWeightHelperInitState() {
    const weightHelperProps: context.BasicState = {
        loraName: '',
        metadataState: undefined,
        srcLoraParams: '',
        weightState: {
            selectedLoraBlockType: loraTypes.LoraBlockTypes.lora,
            selectedModelType: loraTypes.ModelTypes.SD,
            weights: {},
            lbwe: '',
            xyzMode: false,
        },
        blockGroups: [],
        usingBlocks: undefined,
        preset: '',
        lbwPresets: {},
        uiState: {
            isVisible: false,
            scale: 1,
            pos: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
            isMoreButtonVisible: true,
            isWaiting: false,
        },
        lock: false,
        historyIndex: 0,
        previewState: {
            modelId: '',
            triggerWords: [],
            negativeTriggerWords: [],
            modelName: '',
            thumbUrl: '',
            hasMetadata: false,
            description: '',
            isDescriptionVisible: false,
            isTagInsertButtonVisible: false,
        },
    };
    return weightHelperProps;
}

/**
 * Creates and returns the Weight Helper state based on the given parameters.
 * @param namespace - The namespace (e.g., 'lora' or 'lycoris').
 * @param loraName - The name of the LoRA model.
 * @param loraParams - The loraParams string.
 * @param top - The top position for the UI.
 * @param left - The left position for the UI.
 * @returns The constructed BasicState object.
 */
export function createWeightHelperState(namespace: string, loraName: string, loraParams: string, top: number, left: number): context.BasicState {
    let selectedModelType: loraTypes.ModelTypes = loraTypes.ModelTypes.Unknown;
    let selectedLoraBlockType: loraTypes.LoraBlockTypes = loraTypes.LoraBlockTypes.Unknown;
    const histories = historyManager.getHistories(loraName);
    if (histories && histories.length > 0) {
        const latest = histories[histories.length - 1];
        selectedModelType = latest.selectedModelType ?? loraTypes.ModelTypes.Unknown;
        selectedLoraBlockType = latest.selectedLoraBlockType ?? loraTypes.LoraBlockTypes.Unknown;
    }

    let metadataState: context.MetadataState | undefined;
    let usingBlocks: Set<string> | undefined;
    const metadataCache = cacheManager.getMetadataCache(loraName);
    if (metadataCache) {
        metadataState = metadataCache.metadataState;
        selectedModelType = metadataCache.selectedModelType ?? loraTypes.ModelTypes.Unknown;
        selectedLoraBlockType = metadataCache.selectedLoraBlockType ?? loraTypes.LoraBlockTypes.Unknown;
        usingBlocks = metadataCache.usingBlocks;
    }

    const weightState = createWeightState(namespace, loraParams, selectedModelType, selectedLoraBlockType);

    const lbwPresets = currentState.getLbwPresets(weightState.selectedModelType, weightState.selectedLoraBlockType);

    const outputLoraParams = getOutputStrings(loraName, weightState).loraParams;

    let isMoreButtonVisible = false;
    for (const keyType of [WeightControllerTypes.UNET, WeightControllerTypes.START, WeightControllerTypes.STOP]) {
        const weight = weightState.weights[keyType];
        const defVal = configManager.getWeightControllerConfig(keyType as WeightControllerTypes).default;
        const val = +weight.value;
        if (weight.checkState || (weight.checkState === undefined && val != defVal)) {
        } else {
            isMoreButtonVisible = true;
            break;
        }
    }
    return {
        loraName: loraName,
        metadataState: metadataState,
        srcLoraParams: outputLoraParams,
        weightState: weightState,
        blockGroups: configManager.getLbwBlockGroups(weightState.selectedModelType, weightState.selectedLoraBlockType),
        usingBlocks: usingBlocks,
        uiState: {
            isVisible: true,
            scale: window.opts.weight_helper_context_menu_scale,
            isMoreButtonVisible: isMoreButtonVisible,
            isWaiting: !metadataState,
            pos: {
                top: top,
                right: 0,
                bottom: 0,
                left: left,
            },
        },
        previewState: createPreviewState(loraName),
        preset: getPreset(weightState.selectedModelType, weightState.selectedLoraBlockType, lbwPresets, weightState.weights),
        lbwPresets: lbwPresets,
        lock: historyManager.isLocked(loraName, outputLoraParams),
        historyIndex: histories.length - 1,
    };
}

/**
 * Creates and returns the WeightState object from the given parameters.
 * @param namespace - The namespace (e.g., 'lora' or 'lycoris').
 * @param loraParams - The loraParams string.
 * @param modelType - The model type.
 * @param loraBlockType - The LoRA block type.
 * @returns The constructed WeightState object.
 */
export function createWeightState(
    namespace: string,
    loraParams: string,
    modelType: loraTypes.ModelTypes,
    loraBlockType: loraTypes.LoraBlockTypes,
): {
    selectedLoraBlockType: loraTypes.LoraBlockTypes;
    selectedModelType: loraTypes.ModelTypes;
    weights: Record<string, context.WeightControlState>;
    lbwe: string;
    xyzMode: boolean;
} {
    const loraParamsProps = createLoraParamsState(loraParams, modelType, loraBlockType);
    const { weights, lbwe, xyzMode } = loraParamsProps;

    if (loraBlockType === loraTypes.LoraBlockTypes.Unknown) {
        loraBlockType = namespace === 'lora' ? loraTypes.LoraBlockTypes.lora : loraTypes.LoraBlockTypes.lycoris;
    }

    return {
        selectedLoraBlockType: loraBlockType,
        selectedModelType: modelType,
        weights: weights,
        lbwe: lbwe,
        xyzMode: xyzMode,
    };
}

/**
 * Parses the loraParams string and creates the corresponding state for loraParamss, weights, and related flags.
 * @param loraParams - The loraParams string.
 * @param modelType - The model type.
 * @param loraBlockType - The LoRA block type.
 * @returns The parsed state including weights, lbwe, and xyzMode.
 */
export function createLoraParamsState(
    loraParams: string,
    modelType: loraTypes.ModelTypes,
    loraBlockType: loraTypes.LoraBlockTypes,
): {
    selectedModelType: loraTypes.ModelTypes;
    selectedLoraBlockType: loraTypes.LoraBlockTypes;
    weights: Record<string, context.WeightControlState>;
    lbwe: string;
    xyzMode: boolean;
} {
    const loraParamss = loraParams.split(':');

    const loraParamsMap: Record<string, string> = {};
    for (let i = 0; i < loraParamss.length; i++) {
        let key: string;
        let value: string;
        if (loraParamss[i].indexOf('=') >= 0) {
            const keyValue = loraParamss[i].split('=');
            key = keyValue[0].toLowerCase();
            value = keyValue[1];
        } else {
            key = [LoraDefineParams.te, LoraDefineParams.unet][i];
            value = loraParamss[i];
        }
        loraParamsMap[key] = value;
    }

    const loraSdCombination: {
        modelType: loraTypes.ModelTypes;
        loraBlockType: loraTypes.LoraBlockTypes;
        presets: Record<string, string>;
        masks: number[];
    }[] = [];
    for (const modelType of Object.values(SELECTABLE_MODEL_TYPES)) {
        for (const loraBlockType of Object.values(SELECTABLE_LORA_BLOCK_TYPES)) {
            loraSdCombination.push({
                modelType: modelType,
                loraBlockType: loraBlockType,
                presets: currentState.getLbwPresets(modelType, loraBlockType),
                masks: configManager.getLbwMasks(modelType, loraBlockType),
            });
        }
    }

    let te = configManager.getWeightControllerConfig(WeightControllerTypes.TENC).default;
    let unet: number | undefined = undefined;

    let vStart = configManager.getWeightControllerConfig(WeightControllerTypes.START).default;
    let vStop = configManager.getWeightControllerConfig(WeightControllerTypes.STOP).default;

    const lbwVals: number[] = [];
    let lbwe: string = '';
    let xyzModeFlag = false;

    Object.entries(loraParamsMap).forEach(([loraParamKey, value]) => {
        switch (loraParamKey) {
            case LoraDefineParams.lbw:
                if (value === 'XYZ') {
                    xyzModeFlag = true;
                    break;
                }
                let blocks = value.split(',');
                for (const loraSd of loraSdCombination) {
                    if (blocks.length === 1) {
                        if (value in loraSd.presets) {
                            blocks = loraSd.presets[value].split(',');
                        } else {
                            continue;
                        }
                    }
                    if (blocks.length === loraSd.masks.filter((b) => b == 1).length) {
                        modelType = loraSd.modelType;
                        loraBlockType = loraSd.loraBlockType;
                        let refIdx = 0;
                        for (const enable of loraSd.masks) {
                            if (enable) {
                                lbwVals.push(+blocks[refIdx]);
                                refIdx++;
                            } else {
                                lbwVals.push(0);
                            }
                        }
                        break;
                    }
                }
                break;
            case LoraDefineParams.step:
                const startStop = value.split('-');
                vStart = Math.round(+startStop[0]);
                vStop = Math.round(+startStop[1]);
                break;
            case LoraDefineParams.lbwe:
                lbwe = value;
                break;
            case LoraDefineParams.te:
                te = +value;
                break;
            case LoraDefineParams.unet:
                unet = +value;
                break;
            case LoraDefineParams.start:
                vStart = Math.round(+value);
                break;
            case LoraDefineParams.stop:
                vStop = Math.round(+value);
                break;
        }
    });

    let useUnet = true;
    if (unet === undefined) {
        unet = configManager.getWeightControllerConfig(WeightControllerTypes.UNET).default;
        useUnet = false;
    }

    const lbws: Record<string, context.WeightControlState> = {};
    if (modelType !== loraTypes.ModelTypes.Unknown) {
        const blocks = configManager.getLbwBlocks(modelType);
        if (lbwVals.length === 0) {
            for (let i = 0; i < blocks.length; i++) {
                lbwVals.push(configManager.getWeightControllerConfig(WeightControllerTypes.LBW).default);
            }
        }
        lbwVals.forEach((lbw, i) => {
            lbws[blocks[i]] = {
                initValue: lbw,
                value: lbw,
                sliderMin: Math.min(lbw, configManager.getWeightControllerConfig(WeightControllerTypes.LBW).min),
                sliderMax: Math.max(lbw, configManager.getWeightControllerConfig(WeightControllerTypes.LBW).max),
            };
        });
    }

    return {
        selectedLoraBlockType: loraBlockType,
        selectedModelType: modelType,
        weights: {
            [WeightControllerTypes.TENC]: {
                initValue: te,
                value: te,
                sliderMin: Math.min(te, configManager.getWeightControllerConfig(WeightControllerTypes.TENC).min),
                sliderMax: Math.max(te, configManager.getWeightControllerConfig(WeightControllerTypes.TENC).max),
            },
            [WeightControllerTypes.UNET]: {
                initValue: unet,
                value: unet,
                sliderMin: Math.min(unet, configManager.getWeightControllerConfig(WeightControllerTypes.UNET).min),
                sliderMax: Math.max(unet, configManager.getWeightControllerConfig(WeightControllerTypes.UNET).max),
                initCheckState: useUnet,
                checkState: useUnet,
            },
            [WeightControllerTypes.START]: {
                initValue: vStart,
                value: vStart,
                sliderMin: Math.min(vStart, configManager.getWeightControllerConfig(WeightControllerTypes.START).min),
                sliderMax: Math.max(vStart, configManager.getWeightControllerConfig(WeightControllerTypes.START).max),
            },
            [WeightControllerTypes.STOP]: {
                initValue: vStop,
                value: vStop,
                sliderMin: Math.min(vStop, configManager.getWeightControllerConfig(WeightControllerTypes.STOP).min),
                sliderMax: Math.max(vStop, configManager.getWeightControllerConfig(WeightControllerTypes.STOP).max),
            },
            ...lbws,
        },
        lbwe: lbwe,
        xyzMode: xyzModeFlag,
    };
}

/**
 * Creates and returns the PreviewState for the given loraName, using cache if available.
 * @param loraName - The name of the LoRA model.
 * @returns The PreviewState object for the given LoRA model.
 */
function createPreviewState(loraName: string): context.PreviewState {
    const previewCache = cacheManager.getPreviewCache(loraName);
    if (previewCache) {
        return previewCache;
    }
    return {
        modelId: '',
        triggerWords: [''],
        negativeTriggerWords: [''],
        modelName: '',
        thumbUrl: CARD_NO_IMAGE_PATH,
        hasMetadata: false,
        description: '',
        isDescriptionVisible: false,
        isTagInsertButtonVisible: false,
    };
}
