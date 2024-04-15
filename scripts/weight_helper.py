import os
import functools
import gradio as gr
import importlib
import json
import urllib.parse
from fastapi import FastAPI
from modules import script_callbacks, shared, util

prefix = "/whapi/v1"

allowed_preview_extensions = ["png", "jpg", "jpeg", "webp", "gif"]

class WeightHelperAPI:

    instance = None

    @staticmethod
    def init_endpoints(_: gr.Blocks, app: FastAPI):
        if not WeightHelperAPI.instance:
            WeightHelperAPI.instance = WeightHelperAPI()

        instance = WeightHelperAPI.instance
        @app.post(prefix + "/get_preview")
        async def _(key: str):
            return instance.get_preview(key)

    def __new__(cls, *args, **kwargs):
        if not cls.instance:
            cls.instance = super(WeightHelperAPI, cls).__new__(cls, *args, **kwargs)
        return cls.instance

    def __init__(self):
        self.module_lora = importlib.import_module("extensions-builtin.Lora.lora")
        self.lister = util.MassFileLister()

    def get_preview(self, key):
        lora = self.module_lora.available_lora_aliases.get(key)
        if not lora:
            return None

        path, _ = os.path.splitext(lora.filename)
        preview = self._find_preview(path)
        description = self._find_description(path)
        modelId = self._find_civitai_model_id(path)
        return lora.alias, preview, description, modelId

    def _link_preview(self, filename):
        quoted_filename = urllib.parse.quote(filename.replace('\\', '/'))
        mtime, _ = self.lister.mctime(filename)
        #use browser cache
        #return f"./sd_extra_networks/thumb?filename={quoted_filename}&mtime={mtime}"
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    def _find_preview(self, path):
        potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in allowed_preview_extensions], [])
        for file in potential_files:
            if self.lister.exists(file):
                return self._link_preview(file)
        return "./file=html/card-no-preview.png"

    @functools.cache
    def _find_description(self, path):
        for file in [f"{path}.txt", f"{path}.description.txt"]:
            if self.lister.exists(file):
                try:
                    with open(file, "r", encoding="utf-8", errors="replace") as f:
                        return f.read()
                except OSError:
                    pass
        return None

    @functools.cache
    def _find_civitai_model_id(self, path):
        civitai_info = f"{path}.civitai.info"
        if self.lister.exists(civitai_info):
            try:
                with open(civitai_info, "r", encoding="utf-8", errors="replace") as f:
                    return json.load(f).get("modelId")
            except OSError:
                pass
        return None

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
        "weight_helper_preview_height": shared.OptionInfo(400, "Preview height(px)", gr.Number),
        "weight_helper_preview_position": shared.OptionInfo("Top Right", "Preview position", gr.Radio, {
            "choices": ["Top Right", "Bottom Right", "Top Left", "Bottom Left"]
        }),

        "weight_helper_lbw_lora__block_points": shared.OptionInfo(
            "BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11",
            "Advanced option - LoRA block points"
        ).info(
            "default: BASE, IN01-IN04, IN05-IN08, M00, OUT03-OUT06, OUT07-OUT11"
        ),
        "weight_helper_lbw_lora_sdxl_block_points": shared.OptionInfo(
            "BASE, IN04-IN08, M00, OUT00-OUT05",
            "Advanced option - LoRA(SDXL) block points"
        ).info(
            "default: BASE, IN04-IN08, M00, OUT00-OUT05"
        ),
        "weight_helper_lbw_lora_all_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LoRA(Show ALL) bll block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lyco__block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lyco_sdxl_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT8",
            "Advanced option - LyCORIS(SDXL) block points"
        ).info(
            "default: BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT8"
        ),
        "weight_helper_lbw_lyco_all_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS(Show ALL) block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        )
    }))

script_callbacks.on_ui_settings(on_ui_settings)
script_callbacks.on_app_started(WeightHelperAPI.init_endpoints)
