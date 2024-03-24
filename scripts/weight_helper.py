import os
import gradio as gr
import importlib
from fastapi import FastAPI
from modules import script_callbacks, shared
from modules import extra_networks

prefix = "/whapi/v1"

class WeightHelperAPI:

    instance = None

    def __init__(self):
        self.preview_info_dic = {}

    def init(self):
        module_lora = importlib.import_module("extensions-builtin.Lora.lora")
        for _, v in module_lora.available_loras.items():
            dot = v.filename.rfind(".")
            prev_filepath = v.filename[:dot] + ".preview.png"
            if v.name not in self.preview_info_dic and os.path.exists(prev_filepath):
                self.preview_info_dic[v.name] = prev_filepath
                if v.name != v.alias:
                    self.preview_info_dic[v.alias] = prev_filepath

    def get_preview(self, key):
        if key in self.preview_info_dic:
            return self.preview_info_dic[key]
        return None

    @staticmethod
    def init_endpoints(_: gr.Blocks, app: FastAPI):
        if not WeightHelperAPI.instance:
            WeightHelperAPI.instance = WeightHelperAPI()

        instance = WeightHelperAPI.instance
        @app.post(prefix + "/init")
        async def _():
            instance.init()

        @app.post(prefix + "/get_preview")
        async def _(key: str):
            return instance.get_preview(key)

def on_ui_settings():
    """
    Set up the UI settings for the weight helper by adding options to the shared configuration.
    """
    section = ('weight_helper', 'Weight Helper')

    shared.options_templates.update(shared.options_section(section, {
        'weight_helper_enabled': shared.OptionInfo(True, 'Enabled'),
        'weight_helper_context_menu_scale': shared.OptionInfo(0.8, "Context menu scale", gr.Number),
        'weight_helper_using_execCommand': shared.OptionInfo(
            False,'Using the deprecated execCommand function to replace text.'
        ).info(
            "In exchange for no longer being updated in real-time, "
            "you can use 'undo' to revert the text to its previous state."
        ),

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

        'weight_helper_show_preview': shared.OptionInfo(True, 'Show preview'),
        "weight_helper_preview_max_height": shared.OptionInfo(300, "Preview max height(px)", gr.Number),
        "weight_helper_preview_position": shared.OptionInfo("Top Right", "Preview position", gr.Radio, {
            "choices": ["Top Right", "Bottom Right", "Top Left", "Bottom Left"]
        }),

        "weight_helper_lbw_lora__block_points": shared.OptionInfo(
            "BASE, IN01-IN04, IN05-IN08, MID, OUT03-OUT06, OUT07-OUT11",
            "Advanced option - LoRA block points"
        ).info(
            "default: BASE, IN01-IN04, IN05-IN08, MID, OUT03-OUT06, OUT07-OUT11"
        ),
        "weight_helper_lbw_lora_sdxl_block_points": shared.OptionInfo(
            "BASE, IN04-IN08, MID, OUT00-OUT05",
            "Advanced option - LoRA(SDXL) block points"
        ).info(
            "default: BASE, IN04-IN08, MID, OUT00-OUT05"
        ),
        "weight_helper_lbw_lora_all_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LoRA(Show ALL) bll block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lyco__block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lyco_sdxl_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, MID, OUT00-OUT03, OUT04-OUT8",
            "Advanced option - LyCORIS(SDXL) block points"
        ).info(
            "default: BASE, IN00-IN03, IN04-IN08, MID, OUT00-OUT03, OUT04-OUT8"
        ),
        "weight_helper_lbw_lyco_all_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS(Show ALL) block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, MID, OUT00-OUT05, OUT06-OUT11"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_app_started(WeightHelperAPI.init_endpoints)
