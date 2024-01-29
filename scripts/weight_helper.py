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
        'weight_helper_disp_start_slider': shared.OptionInfo(False, 'Display Start slider'),
        'weight_helper_disp_stop_slider': shared.OptionInfo(False, 'Display Stop slider'),
        "weight_helper_te_min": shared.OptionInfo(0, "TEnc min value", gr.Number),
        "weight_helper_te_max": shared.OptionInfo(1, "TEnc max value", gr.Number),
        "weight_helper_te_step": shared.OptionInfo(0.05, "TEnc step", gr.Number),
        'weight_helper_disp_unet_slider': shared.OptionInfo(False, 'Display UNet slider'),
        "weight_helper_unet_min": shared.OptionInfo(0, "UNet min value", gr.Number),
        "weight_helper_unet_max": shared.OptionInfo(1, "UNet max value", gr.Number),
        "weight_helper_unet_step": shared.OptionInfo(0.05, "UNet step", gr.Number),
        'weight_helper_disp_dyn_slider': shared.OptionInfo(False, 'Display Dyn slider'),
        "weight_helper_dyn_min": shared.OptionInfo(0, "Dyn min value", gr.Number),
        "weight_helper_dyn_max": shared.OptionInfo(256, "Dyn max value", gr.Number),
        "weight_helper_dyn_step": shared.OptionInfo(8, "Dyn step", gr.Number),
        "weight_helper_lbw_min": shared.OptionInfo(0, "LBW(Lora Block Weight) min value", gr.Number),
        "weight_helper_lbw_max": shared.OptionInfo(1, "LBW(Lora Block Weight) max value", gr.Number),
        "weight_helper_lbw_step": shared.OptionInfo(0.05, "LBW(Lora Block Weight) step", gr.Number),
        "weight_helper_lbw_lora_blocks": shared.OptionInfo(
            "0: BASE, 1: IND, 4: INS, 7: MIDD, 8: OUTD, 12: OUTS",
            "Advanced option - Lora blocks"
        ).info(
            "default: 0: BASE, 1: IND, 4: INS, 7: MIDD, 8: OUTD, 12: OUTS"
        ),
        "weight_helper_lbw_lyco_blocks": shared.OptionInfo(
            "0: BASE, 1: IN00-05, 7: IN06-11, 13: MID, 14: OUT00-05, 20: OUT06-11",
            "Advanced option - Lyco blocks"
        ).info(
            "default: 0: BASE, 1: IN00-05, 7: IN06-11, 13: MID, 14: OUT00-05, 20: OUT06-11"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
