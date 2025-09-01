export const NamespaceTypes = {
    lora: 'lora',
    lyco: 'lyco',
} as const;
export type NamespaceTypes = (typeof NamespaceTypes)[keyof typeof NamespaceTypes];

export const LoraBlockTypes = {
    lora: 'lora',
    lycoris: 'lycoris',
    Unknown: 'Unknown',
} as const;
export type LoraBlockTypes = (typeof LoraBlockTypes)[keyof typeof LoraBlockTypes];

export const ModelTypes = {
    SD: 'SD',
    SDXL: 'SDXL',
    Flux: 'Flux',
    Unknown: 'Unknown',
} as const;
export type ModelTypes = (typeof ModelTypes)[keyof typeof ModelTypes];

export const LoraDefineParams = {
    te: 'te',
    unet: 'unet',
    start: 'start',
    stop: 'stop',
    step: 'step',
    lbw: 'lbw',
    lbwe: 'lbwe',
} as const;
export type LoraDefineParams = (typeof LoraDefineParams)[keyof typeof LoraDefineParams];

export const WeightControllerTypes = {
    TENC: 'TEnc',
    UNET: 'UNet',
    START: 'Start',
    STOP: 'Stop',
    LBW: 'LBW',
} as const;
export type WeightControllerTypes = (typeof WeightControllerTypes)[keyof typeof WeightControllerTypes];
