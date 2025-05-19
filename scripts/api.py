
import ast
import json
import os
from typing import Any, Optional
from modules import shared
from scripts import analyzer, const, utils


def get_metadata(key, force) -> dict[str, Optional[str]]:
    ret: dict[str, Optional[str]] = {
        "modelType": None,
        "algorithm": None,
        "baseModel": None,
        "usingBlocks": None
    }

    lora_on_disk = utils.get_lora_on_disk(key)
    if not lora_on_disk:
        return ret

    ret["modelType"] = analyzer.get_model_type(lora_on_disk)

    metadata = lora_on_disk.metadata
    ss_network_args = __get_network_args(lora_on_disk)
    ret["algorithm"] = analyzer.get_algorithm(metadata, ss_network_args)

    model_path, _ = os.path.splitext(lora_on_disk.filename)
    civitai_info = __find_civitai_info(model_path)
    ret["baseModel"] = civitai_info.get("baseModel", None)

    if shared.opts.weight_helper_parse_lora_blocks:
        try:
            ret["usingBlocks"] = analyzer.get_blocks(lora_on_disk, force)
        except Exception:
            pass
    return ret


def get_preview_info(key):
    ret: dict[str, Optional[bool | str | list[str]]] = {
        "modelId": None,
        "triggerWords": [],
        "negativeTriggerWords": [],
        "modelName": None,
        "thumbUrl": None,
        "hasMetadata": False,
        "description": None,
    }

    lora_on_disk = utils.get_lora_on_disk(key)
    if lora_on_disk:
        model_path, _ = os.path.splitext(lora_on_disk.filename)
        ret["modelName"] = lora_on_disk.name
        ret["thumbUrl"] = __find_preview(model_path)
        ret["hasMetadata"] = __find_metadata(lora_on_disk)
        ret["description"] = __find_description(model_path)

        trigger_words = []
        civitai_info = __find_civitai_info(model_path)
        ret["modelId"] = civitai_info.get("modelId", None)
        trigger_words = civitai_info.get("trainedWords", [])
        trigger_words = ",".join(trigger_words).split(",")
        ret["triggerWords"] = [w.strip() for w in trigger_words if w]

        lora_json = __get_lora_json(model_path)

        activation_text = lora_json.get("activation text", "")
        if activation_text:
            activation_text = activation_text.split(",")
            activation_text = [w.strip() for w in activation_text if w]
            ret["triggerWords"] = activation_text

        negative_text = lora_json.get("negative text", "")
        if negative_text:
            negative_text = negative_text.split(",")
            negative_text = [w.strip() for w in negative_text if w]
            ret["negativeTriggerWords"] = negative_text

        json_description = lora_json.get("description", None)
        if json_description:
            ret["description"] = json_description

    return ret


def __get_network_args(lora) -> dict[str, Any]:
    metadata = lora.metadata
    ss_network_args = metadata.get("ss_network_args", {})
    if type(ss_network_args) is str:
        try:
            ss_network_args = ast.literal_eval(ss_network_args)
        except Exception:
            ss_network_args = {}
    return ss_network_args


def __get_lora_json(path) -> dict[str, Any]:
    if path:
        lora_json = f"{path}.json"
        if os.path.exists(lora_json):
            try:
                with open(lora_json, "r", encoding="utf-8", errors="replace") as f:
                    return json.load(f)
            except OSError:
                pass
    return {}


def __find_preview(path) -> str:
    if path:
        potential_files = sum([[f"{path}.{ext}", f"{path}.preview.{ext}"] for ext in const.ALLOWED_PREVIEW_EXTENSIONS], [])
        for file in potential_files:
            if os.path.exists(file):
                dpi_scale = 1.5
                return utils.resize_to_base64(file, int(shared.opts.weight_helper_preview_height * dpi_scale))
    return "./file=html/card-no-preview.png"


def __find_metadata(lora) -> bool:
    return len(lora.metadata) > 0 if lora else False


def __find_description(path) -> Optional[str]:
    if path:
        for file in [f"{path}.txt", f"{path}.description.txt"]:
            if os.path.exists(file):
                try:
                    with open(file, "r", encoding="utf-8", errors="replace") as f:
                        return f.read()
                except OSError:
                    pass
    return None


def __find_civitai_info(path) -> dict[str, Any]:
    if path:
        civitai_info = f"{path}.civitai.info"
        if os.path.exists(civitai_info):
            try:
                with open(civitai_info, "r", encoding="utf-8", errors="replace") as f:
                    return json.load(f)
            except OSError:
                pass
    return {}
