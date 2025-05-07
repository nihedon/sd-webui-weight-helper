import { LoraBlockTypes, ModelTypes } from '@/shared/types/lora-types';

const BASE_MODEL_TYPE = {
    STABLE_DIFFUSION: [
        'BASE',
        'IN00',
        'IN01',
        'IN02',
        'IN03',
        'IN04',
        'IN05',
        'IN06',
        'IN07',
        'IN08',
        'IN09',
        'IN10',
        'IN11',
        'M00',
        'OUT00',
        'OUT01',
        'OUT02',
        'OUT03',
        'OUT04',
        'OUT05',
        'OUT06',
        'OUT07',
        'OUT08',
        'OUT09',
        'OUT10',
        'OUT11',
    ],
    BLACK_FOREST_LABS: [
        'FL00',
        'FL01',
        'FL02',
        'FL03',
        'FL04',
        'FL05',
        'FL06',
        'FL07',
        'FL08',
        'FL09',
        'FL10',
        'FL11',
        'FL12',
        'FL13',
        'FL14',
        'FL15',
        'FL16',
        'FL17',
        'FL18',
    ],
};

export const LBW_BLOCKS = {
    [ModelTypes.SD]: BASE_MODEL_TYPE.STABLE_DIFFUSION,
    [ModelTypes.SDXL]: BASE_MODEL_TYPE.STABLE_DIFFUSION,
    [ModelTypes.Flux]: BASE_MODEL_TYPE.BLACK_FOREST_LABS,
    [ModelTypes.Unknown]: [],
};

export const lbwMaskDefine = {
    [ModelTypes.SD]: {
        [LoraBlockTypes.lora]: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [LoraBlockTypes.lycoris]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [LoraBlockTypes.Unknown]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    [ModelTypes.SDXL]: {
        [LoraBlockTypes.lora]: [1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [LoraBlockTypes.lycoris]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [LoraBlockTypes.Unknown]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    [ModelTypes.Flux]: {
        [LoraBlockTypes.lora]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [LoraBlockTypes.lycoris]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [LoraBlockTypes.Unknown]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    [ModelTypes.Unknown]: {
        [LoraBlockTypes.lora]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [LoraBlockTypes.lycoris]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [LoraBlockTypes.Unknown]: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
};

export const XYZ_PRESETS = {
    [ModelTypes.SD]: {
        [LoraBlockTypes.lora]: 'XYZ(17)',
        [LoraBlockTypes.lycoris]: 'XYZ(26)',
        [LoraBlockTypes.Unknown]: 'XYZ(26)',
    },
    [ModelTypes.SDXL]: {
        [LoraBlockTypes.lora]: 'XYZ(12)',
        [LoraBlockTypes.lycoris]: 'XYZ(20)',
        [LoraBlockTypes.Unknown]: 'XYZ(26)',
    },
    [ModelTypes.Flux]: {
        [LoraBlockTypes.lora]: 'XYZ(19)',
        [LoraBlockTypes.lycoris]: 'XYZ(19)',
        [LoraBlockTypes.Unknown]: 'XYZ(19)',
    },
    [ModelTypes.Unknown]: {
        [LoraBlockTypes.lora]: 'XYZ(17)',
        [LoraBlockTypes.lycoris]: 'XYZ(26)',
        [LoraBlockTypes.Unknown]: 'XYZ(26)',
    },
};

export const SELECTABLE_MODEL_TYPES = {
    '': ModelTypes.Unknown,
    SD: ModelTypes.SD,
    SDXL: ModelTypes.SDXL,
    Flux: ModelTypes.Flux,
};

export const SELECTABLE_LORA_BLOCK_TYPES = {
    '': LoraBlockTypes.Unknown,
    'LoRA(LierLa)': LoraBlockTypes.lora,
    'LyCORIS,etc': LoraBlockTypes.lycoris,
};

export const CARD_NO_IMAGE_PATH = './file=html/card-no-preview.png';
