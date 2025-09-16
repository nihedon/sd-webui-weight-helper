declare global {
    interface Window {
        opts: {
            weight_helper_enabled: boolean;
            weight_helper_context_menu_scale: number;
            weight_helper_using_execCommand: boolean;

            weight_helper_slider_length: number;

            weight_helper_TEnc_min: number;
            weight_helper_TEnc_max: number;
            weight_helper_TEnc_step: number;

            weight_helper_UNet_min: number;
            weight_helper_UNet_max: number;
            weight_helper_UNet_step: number;

            weight_helper_LBW_min: number;
            weight_helper_LBW_max: number;
            weight_helper_LBW_step: number;

            weight_helper_show_preview: boolean;
            weight_helper_preview_height: number;
            weight_helper_preview_position: string;

            weight_helper_parse_lora_blocks: string;

            weight_helper_LBW_SD_lora_block_points: string;

            weight_helper_LBW_SD_lycoris_block_points: string;

            weight_helper_LBW_SDXL_lora_block_points: string;

            weight_helper_LBW_SDXL_lycoris_block_points: string;

            [key: string]: unknown;
        };
        TAC_CFG: {
            activeIn: {
                global: boolean | undefined;
            };
        };
        pilotIsActive: boolean | undefined;
    }
    function gradioApp(): Document;

    const opts: Window['opts'];
}

export {};
