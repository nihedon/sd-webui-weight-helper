import gradio as gr
from modules import script_callbacks, shared

def on_ui_settings():
    section = ('weight_helper', 'Weight Helper')
    shared.opts.add_option('weight_helper_enabled', shared.OptionInfo(True, 'Enabled', section=section))
    shared.opts.add_option("weight_helper_te_min", shared.OptionInfo(0, "TEnc min value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_te_max", shared.OptionInfo(1, "TEnc max value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_te_step", shared.OptionInfo(0.05, "TEnc step", gr.Number, section=section))
    shared.opts.add_option("weight_helper_unet_min", shared.OptionInfo(0, "UNet min value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_unet_max", shared.OptionInfo(1, "UNet max value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_unet_step", shared.OptionInfo(0.05, "UNet step", gr.Number, section=section))
    shared.opts.add_option("weight_helper_dyn_min", shared.OptionInfo(0, "Dyn min value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_dyn_max", shared.OptionInfo(256, "Dyn max value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_dyn_step", shared.OptionInfo(8, "Dyn step", gr.Number, section=section))
    shared.opts.add_option("weight_helper_lbw_min", shared.OptionInfo(0, "LBW(Lora Block Weight) min value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_lbw_max", shared.OptionInfo(1, "LBW(Lora Block Weight) max value", gr.Number, section=section))
    shared.opts.add_option("weight_helper_lbw_step", shared.OptionInfo(0.05, "LBW(Lora Block Weight) step", gr.Number, section=section))

script_callbacks.on_ui_settings(on_ui_settings)
