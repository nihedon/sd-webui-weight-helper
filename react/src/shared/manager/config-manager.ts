import {
    LBW_BLOCKS,
    lbwMaskDefine as LBW_MASK_DEFINE,
    SELECTABLE_LORA_BLOCK_TYPES,
    SELECTABLE_MODEL_TYPES,
    XYZ_PRESETS,
} from '@/shared/constants/common-const';
import { LoraBlockTypes, ModelTypes, WeightControllerTypes } from '@/shared/types/lora-types';

interface WeightControllerInterface {
    min: number;
    max: number;
    default: number;
    step: number;
}

const WeightControllerConfig: Record<string, WeightControllerInterface> = {
    [WeightControllerTypes.TENC]: {
        min: 0,
        max: 0,
        default: 1,
        step: 0.5,
    },
    [WeightControllerTypes.UNET]: {
        min: 0,
        max: 0,
        default: 0,
        step: 0.5,
    },
    [WeightControllerTypes.DYN]: {
        min: 0,
        max: 0,
        default: 0,
        step: 0.5,
    },
    [WeightControllerTypes.START]: {
        min: 0,
        max: 0,
        default: 0,
        step: 1,
    },
    [WeightControllerTypes.STOP]: {
        min: 0,
        max: 0,
        default: 0,
        step: 1,
    },
    [WeightControllerTypes.LBW]: {
        min: 0,
        max: 0,
        default: 1,
        step: 0.5,
    },
};

const lbwGroupConfig = {
    [ModelTypes.SD]: {
        [LoraBlockTypes.lora]: ['BASE', 'IN01-IN04', 'IN05-IN08', 'M00', 'OUT03-OUT06', 'OUT07-OUT11'],
        [LoraBlockTypes.lycoris]: ['BASE', 'IN00-IN05', 'IN06-IN11', 'M00', 'OUT00-OUT05', 'OUT06-OUT11'],
        [LoraBlockTypes.Unknown]: [] as string[],
    },
    [ModelTypes.SDXL]: {
        [LoraBlockTypes.lora]: ['BASE', 'IN04-IN08', 'M00', 'OUT00-OUT05'],
        [LoraBlockTypes.lycoris]: ['BASE', 'IN00-IN03', 'IN04-IN08', 'M00', 'OUT00-OUT03', 'OUT04-OUT08'],
        [LoraBlockTypes.Unknown]: [] as string[],
    },
    [ModelTypes.Flux]: {
        [LoraBlockTypes.lora]: ['FL00-FL03', 'FL04-FL07', 'FL08-FL10', 'FL11-FL14', 'FL15-FL18'],
        [LoraBlockTypes.lycoris]: ['FL00-FL03', 'FL04-FL07', 'FL08-FL10', 'FL11-FL14', 'FL15-FL18'],
        [LoraBlockTypes.Unknown]: [] as string[],
    },
    [ModelTypes.Unknown]: {
        [LoraBlockTypes.lora]: [] as string[],
        [LoraBlockTypes.lycoris]: [] as string[],
        [LoraBlockTypes.Unknown]: [] as string[],
    },
};

/**
 * Initializes the configuration for block groups and weight controllers.
 * Updates configuration values with settings from window.opts.
 */
export function initialize() {
    const optBlockPattern = /((BASE|MID|M00|(IN|OUT|FL)[0-9]{2}(-(IN|OUT|FL)[0-9]{2})?) *(, *|$))+/;
    for (const modelType of Object.values(SELECTABLE_MODEL_TYPES)) {
        if (modelType === ModelTypes.Unknown) continue;
        for (const loraBlockType of Object.values(SELECTABLE_LORA_BLOCK_TYPES)) {
            if (loraBlockType === LoraBlockTypes.Unknown) continue;
            try {
                let optBlockPoints = window.opts[`weight_helper_LBW_${modelType}_${loraBlockType}_block_points`] as string;
                optBlockPoints = optBlockPoints.replace('MID', 'M00');
                if (optBlockPattern.exec(optBlockPoints)) {
                    const blockPoints = optBlockPoints.split(',').map((v) => {
                        return v.trim().replace(/\d+/g, (match) => (match.length === 1 ? `0${match}` : match));
                    });
                    lbwGroupConfig[modelType][loraBlockType] = blockPoints;
                }
            } catch (e) {
                console.warn(`${modelType}_${loraBlockType} block definition format is invalid.`, e);
            }
        }
    }

    for (const k of [WeightControllerTypes.TENC, WeightControllerTypes.UNET, WeightControllerTypes.DYN, WeightControllerTypes.LBW]) {
        WeightControllerConfig[k].min = +window.opts[`weight_helper_${k}_min`];
        WeightControllerConfig[k].max = +window.opts[`weight_helper_${k}_max`];
        WeightControllerConfig[k].step = +window.opts[`weight_helper_${k}_step`];
    }
}

/**
 * Retrieves the configuration for a specific weight controller type.
 * @param type - The weight controller type.
 * @returns The configuration object for the specified controller type.
 */
export function getWeightControllerConfig(type: string): WeightControllerInterface {
    return WeightControllerConfig[type];
}

/**
 * Returns the list of LBW blocks for the selected model type.
 * @param selectedModelType - The selected model type.
 * @returns An array of block labels for the given model type.
 */
export function getLbwBlocks(selectedModelType: ModelTypes): string[] {
    if (selectedModelType in LBW_BLOCKS) {
        return LBW_BLOCKS[selectedModelType];
    }
    return LBW_BLOCKS[ModelTypes.Unknown];
}

/**
 * Returns an array of enabled LBW block labels for the selected model and LoRA block type.
 * Only blocks with a mask value of 1 are included.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @returns An array of enabled block labels.
 */
export function getMaskedLbwBlocks(selectedModelType: ModelTypes, selectedLoraBlockType: LoraBlockTypes): string[] {
    const masks = getLbwMasks(selectedModelType, selectedLoraBlockType);
    return LBW_BLOCKS[selectedModelType || ModelTypes.Unknown].filter((_, i) => masks[i] === 1);
}

/**
 * Returns the mask array for LBW blocks for the selected model and block type.
 * Each value in the array (1 or 0) indicates whether the corresponding block is enabled.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @returns An array of binary values (1=enabled, 0=disabled).
 */
export function getLbwMasks(selectedModelType: ModelTypes, selectedLoraBlockType: LoraBlockTypes): number[] {
    return LBW_MASK_DEFINE[selectedModelType || ModelTypes.Unknown][selectedLoraBlockType || LoraBlockTypes.Unknown];
}

/**
 * Returns the block groups configuration for the selected model and block type.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @returns An array of block group identifiers.
 */
export function getLbwBlockGroups(selectedModelType: ModelTypes, selectedLoraBlockType: LoraBlockTypes): string[] {
    return lbwGroupConfig[selectedModelType || ModelTypes.Unknown][selectedLoraBlockType || LoraBlockTypes.Unknown];
}

/**
 * Returns the XYZ label for the selected model and block type.
 * @param selectedModelType - The selected model type.
 * @param selectedLoraBlockType - The selected LoRA block type.
 * @returns The XYZ identifier string.
 */
export function getXyzLabel(selectedModelType: ModelTypes, selectedLoraBlockType: LoraBlockTypes): string {
    return XYZ_PRESETS[selectedModelType || ModelTypes.Unknown][selectedLoraBlockType || LoraBlockTypes.Unknown];
}
