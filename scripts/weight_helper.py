import gradio as gr
from modules import script_callbacks, shared

def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')

    shared.options_templates.update(shared.options_section(section, {
        'weight_helper_enabled': shared.OptionInfo(True, 'Enabled'),
        'weight_helper_context_menu_scale': shared.OptionInfo(0.9, "Context menu scale", gr.Number),
        'weight_helper_using_execCommand': shared.OptionInfo(
            False,'Using the deprecated execCommand function to replace text.'
        ).info(
            "In exchange for no longer being updated in real-time, "
            "you can use 'undo' to revert the text to its previous state."
        ),

        'weight_helper_disp_unet_slider': shared.OptionInfo(False, 'Display UNet slider'),
        'weight_helper_disp_dyn_slider': shared.OptionInfo(False, 'Display Dyn slider'),
        'weight_helper_disp_start_slider': shared.OptionInfo(False, 'Display Start slider'),
        'weight_helper_disp_stop_slider': shared.OptionInfo(False, 'Display Stop slider'),

        "weight_helper_te_min": shared.OptionInfo(0, "TEnc min value", gr.Number),
        "weight_helper_te_max": shared.OptionInfo(1, "TEnc max value", gr.Number),
        "weight_helper_te_step": shared.OptionInfo(0.05, "TEnc step", gr.Number),

        "weight_helper_unet_min": shared.OptionInfo(0, "UNet min value", gr.Number),
        "weight_helper_unet_max": shared.OptionInfo(1, "UNet max value", gr.Number),
        "weight_helper_unet_step": shared.OptionInfo(0.05, "UNet step", gr.Number),

        "weight_helper_dyn_min": shared.OptionInfo(0, "Dyn min value", gr.Number),
        "weight_helper_dyn_max": shared.OptionInfo(128, "Dyn max value", gr.Number),
        "weight_helper_dyn_step": shared.OptionInfo(8, "Dyn step", gr.Number),

        "weight_helper_lbw_min": shared.OptionInfo(0, "LBW(Lora Block Weight) min value", gr.Number),
        "weight_helper_lbw_max": shared.OptionInfo(1, "LBW(Lora Block Weight) max value", gr.Number),
        "weight_helper_lbw_step": shared.OptionInfo(0.05, "LBW(Lora Block Weight) step", gr.Number),

        "weight_helper_lbw_lora_block_points": shared.OptionInfo(
            "0, 1, 4, 7, 8, 12",
            "Advanced option - Lora blocks"
        ).info(
            "default: 0, 1, 4, 7, 8, 12"
        ),
        "weight_helper_lbw_lyco_block_points": shared.OptionInfo(
            "0, 1, 7, 13, 14, 20",
            "Advanced option - Lyco blocks"
        ).info(
            "default: 0, 1, 7, 13, 14, 20"
        ),
        "weight_helper_lbw_lora_sdxl_block_points": shared.OptionInfo(
            "0, 1, 5, 6",
            "Advanced option - Lora(SDXL) blocks"
        ).info(
            "default: 0, 1, 5, 6"
        ),
        "weight_helper_lbw_lyco_sdxl_block_points": shared.OptionInfo(
            "0, 1, 5, 10, 11, 15",
            "Advanced option - Lyco(SDXL) blocks"
        ).info(
            "default: 0, 1, 5, 10, 11, 15"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
