import os
import gradio as gr
import importlib
import json
import urllib.parse
from fastapi import FastAPI
from modules import script_callbacks, shared

prefix = "/whapi/v1"

allowed_preview_extensions = ["png", "jpg", "jpeg", "webp", "gif"]

class WeightHelperAPI:

    instance = None

    @staticmethod
    def init_endpoints(_: gr.Blocks, app: FastAPI):
        if not WeightHelperAPI.instance:
            WeightHelperAPI.instance = WeightHelperAPI()

        instance = WeightHelperAPI.instance
        @app.post(prefix + "/get_lora_info")
        async def _(key: str):
            return instance.get_lora_info(key)

        @app.post(prefix + "/get_preview_info")
        async def _(key: str):
            return instance.get_preview_info(key)

    def __new__(cls, *args, **kwargs):
        if not cls.instance:
            cls.instance = super(WeightHelperAPI, cls).__new__(cls, *args, **kwargs)
        return cls.instance

    def __init__(self):
        pass

    def __get_networks(self):
        try:
            return importlib.import_module("extensions-builtin.Lora.ui_extra_networks_lora").networks
        except Exception:
            return None

    def get_lora_info(self, key):
        sd_version = None
        ss_network_module = None

        networks = self.__get_networks()
        if networks:
            lora_on_disk = networks.available_network_aliases.get(key)
            if not lora_on_disk:
                # sdnext
                lora_on_disk = next((v for v in networks.available_network_aliases.values() if v.alias == key), None)
            if lora_on_disk:
                sd_version = lora_on_disk.sd_version.name
                if sd_version == "Unknown":
                    sd_version = None
                ss_network_module = lora_on_disk.metadata.get("ss_network_module")

        return sd_version, ss_network_module

    def get_preview_info(self, key):
        name = key
        lora_on_disk = None
        path = None

        networks = self.__get_networks()
        if networks:
            lora_on_disk = networks.available_network_aliases.get(key)
            if not lora_on_disk:
                # sdnext
                lora_on_disk = next((v for v in networks.available_network_aliases.values() if v.alias == key), None)
            if lora_on_disk:
                path, _ = os.path.splitext(lora_on_disk.filename)
                name = lora_on_disk.name

        preview = self.__find_preview(path)
        has_metadata = self.__find_metadata(lora_on_disk)
        description = self.__find_description(path)
        modelId = self.__find_civitai_model_id(path)
        return name, preview, has_metadata, description, modelId

    def __link_preview(self, filename):
        quoted_filename = urllib.parse.quote(filename.replace('\\', '/'))
        #use browser cache
        #mtime, _ = self.lister.mctime(filename)
        #return f"./sd_extra_networks/thumb?filename={quoted_filename}&mtime={mtime}"
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    def __find_preview(self, path):
        if path:
            potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in allowed_preview_extensions], [])
            for file in potential_files:
                if os.path.exists(file):
                    return self.__link_preview(file)
        return "./file=html/card-no-preview.png"

    def __find_metadata(self, lora):
        return len(lora.metadata) > 0 if lora else False

    #@functools.cache
    def __find_description(self, path):
        if path:
            for file in [f"{path}.txt", f"{path}.description.txt"]:
                if os.path.exists(file):
                    try:
                        with open(file, "r", encoding="utf-8", errors="replace") as f:
                            return f.read()
                    except OSError:
                        pass
        return None

    #@functools.cache
    def __find_civitai_model_id(self, path):
        if path:
            civitai_info = f"{path}.civitai.info"
            if os.path.exists(civitai_info):
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
        'weight_helper_fix_lora': shared.OptionInfo(True, 'Fix tag name to \'lora\' after editing'),

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

        "weight_helper_lbw_lora_sd1_block_points": shared.OptionInfo(
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
        "weight_helper_lbw_lyco_sd1_block_points": shared.OptionInfo(
            "BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11",
            "Advanced option - LyCORIS block points"
        ).info(
            "default: BASE, IN00-IN05, IN06-IN11, M00, OUT00-OUT05, OUT06-OUT11"
        ),
        "weight_helper_lbw_lyco_sdxl_block_points": shared.OptionInfo(
            "BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08",
            "Advanced option - LyCORIS(SDXL) block points"
        ).info(
            "default: BASE, IN00-IN03, IN04-IN08, M00, OUT00-OUT03, OUT04-OUT08"
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
