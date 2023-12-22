import gradio as gr
from modules import script_callbacks, shared

def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')
    shared.opts.add_option(
        'weight_helper_enabled',
        shared.OptionInfo(True, 'Enabled', section=section)
    )
    shared.opts.add_option(
        'weight_helper_using_execCommand',
        shared.OptionInfo(
            False,'Using the deprecated execCommand function to replace text.', section=section
        ).info(
            "In exchange for no longer being updated in real-time, "
            "you can use 'undo' to revert the text to its previous state."
        )
    )
    shared.opts.add_option(
        'weight_helper_disp_start_slider',
        shared.OptionInfo(False, 'Display Start slider', section=section)
    )
    shared.opts.add_option(
        'weight_helper_disp_stop_slider',
        shared.OptionInfo(False, 'Display Stop slider', section=section)
    )
    shared.opts.add_option(
        "weight_helper_te_min",
        shared.OptionInfo(0, "TEnc min value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_te_max",
        shared.OptionInfo(1, "TEnc max value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_te_step",
        shared.OptionInfo(0.05, "TEnc step", gr.Number, section=section)
    )
    shared.opts.add_option(
        'weight_helper_disp_unet_slider',
        shared.OptionInfo(False, 'Display UNet slider', section=section)
    )
    shared.opts.add_option(
        "weight_helper_unet_min",
        shared.OptionInfo(0, "UNet min value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_unet_max",
        shared.OptionInfo(1, "UNet max value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_unet_step",
        shared.OptionInfo(0.05, "UNet step", gr.Number, section=section)
    )
    shared.opts.add_option(
        'weight_helper_disp_dyn_slider',
        shared.OptionInfo(False, 'Display Dyn slider', section=section)
    )
    shared.opts.add_option(
        "weight_helper_dyn_min",
        shared.OptionInfo(0, "Dyn min value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_dyn_max",
        shared.OptionInfo(256, "Dyn max value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_dyn_step",
        shared.OptionInfo(8, "Dyn step", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_lbw_min",
        shared.OptionInfo(0, "LBW(Lora Block Weight) min value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_lbw_max",
        shared.OptionInfo(1, "LBW(Lora Block Weight) max value", gr.Number, section=section)
    )
    shared.opts.add_option(
        "weight_helper_lbw_step",
        shared.OptionInfo(0.05, "LBW(Lora Block Weight) step", gr.Number, section=section)
    )

script_callbacks.on_ui_settings(on_ui_settings)
