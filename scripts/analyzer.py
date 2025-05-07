import os
import pickle
import re
from typing import Optional
from scripts import const, env


def get_model_type(lora) -> Optional[str]:
    if env.ui_type == const.UI_TYPE.A1111:
        sd_version: Optional[str] = lora.sd_version.name
        if sd_version and env.network:
            if sd_version == env.network.SdVersion.SD1.name or sd_version == env.network.SdVersion.SD2.name:
                return "SD"
            elif sd_version == env.network.SdVersion.SDXL.name:
                return "SDXL"
            return sd_version
    elif env.ui_type == const.UI_TYPE.NEW_FORGE:
        base_model_version: Optional[str] = lora.metadata.get("ss_base_model_version")
        if base_model_version:
            base_model_version = base_model_version.lower()
            if "sd_" in base_model_version:
                return "SD"
            if "sd3" in base_model_version:
                return "SD"
            elif "sdxl" in base_model_version:
                return "SDXL"
            elif "flux" in base_model_version:
                return "FLUX"
            return None
    return None


def get_algorithm(metadata, ss_network_args) -> Optional[str]:
    ss_network_module = metadata.get("ss_network_module")
    if not ss_network_module or ss_network_module == "Unknown":
        return None

    conv_dim = float(ss_network_args.get("conv_dim", "-1"))
    conv_alpha = float(ss_network_args.get("conv_alpha", "-1"))
    algo = ss_network_args.get("algo", "").lower()
    unit = ss_network_args.get("unit", "").lower()
    dora_wd = ss_network_args.get("dora_wd", False)

    if ss_network_module.find("locon.locon_kohya") >= 0:
        return "LoCon"

    elif ss_network_module.find("lycoris.kohya") >= 0:
        algoName = ""
        if dora_wd:
            algoName = "(DoRA)"
        elif algo == "lora":
            algoName += "(LoCon)"
        elif algo == "locon":
            if unit:
                algoName += "(DyLoRA)"
            else:
                algoName += "(LoCon)"
        elif algo == "loha":
            algoName += "(LoHa)"
        elif algo == "lokr":
            algoName += "(Lokr)"
        elif algo == "ia3":
            algoName += "(IA3)"
        elif algo == "full":
            algoName += "(Full)"
        elif algo == "glora":
            algoName += "(GLoRA)"

        return f"LyCORIS{algoName}"

    elif ss_network_module.find("networks.dylora") >= 0:
        if algo == "dylora" and unit:
            if conv_dim > 0 or conv_alpha > 0:
                return "DyLoRA(C3Lier)"
        return "DyLoRA(LierLa)"

    elif conv_dim > 0 or conv_alpha > 0:
        return "LoRA(C3Lier)"

    else:
        return "LoRA(LierLa)"


def get_blocks(lora_on_disk, force):
    baseKeys = __get_lora_state_keys(lora_on_disk.filename, force)

    def formatForDownMidUp(key):
        blocks = ["BASE"]
        for key in keys:
            k, v = key.split("_", 1)
            if k == "down":
                k = "IN"
                v1, v2 = v.split("_")
                val = int(v1) * 3 + int(v2) + 1
            elif k == "mid":
                blocks.append("M00")
                continue
            elif k == "up":
                k = "OUT"
                v1, v2 = v.split("_")
                val = int(v1) * 3 + int(v2)
            blocks.append(f'{k}{int(val):02}')
        return sorted(blocks)

    def formatForInputMiddleOutput(key):
        blocks = ["BASE"]
        for key in keys:
            k, v = key.split("_")
            if k == "input":
                k = "IN"
            elif k == "middle":
                blocks.append("M00")
                continue
            elif k == "output":
                k = "OUT"
            blocks.append(f'{k}{int(v):02}')
        return sorted(blocks)

    def formatForFlux(key):
        blockSet = set()
        for key in keys:
            k, v = key.split("_")
            v = int(v)
            if k == "single":
                if v > 18:
                    v -= 19
            blockSet.add(f'FL{v:02}')
        return sorted(list(blockSet))

    keys = [k for k in baseKeys if k.find("lora_unet") == 0]
    if len(keys) > 0:
        keys_tmp = [k for k in keys if re.match("^lora_unet_(down|mid|up)_", k)]
        if len(keys_tmp) > 0:
            keys = set(["_".join([k.split("_")[2], k.split("_")[4] + "_" + k.split("_")[6]]) for k in keys_tmp if "transformer_blocks" in k])
            return formatForDownMidUp(keys)

        keys_tmp = [k for k in keys if re.match("^lora_unet_(input|middle|output)_", k)]
        if len(keys_tmp) > 0:
            keys = set(["_".join([k.split("_")[2], k.split("_")[4]]) for k in keys_tmp if "transformer_blocks" in k])
            return formatForInputMiddleOutput(keys)

        keys_tmp = [k for k in keys if re.match("^lora_unet_(single|double)_", k)]
        if len(keys_tmp) > 0:
            keys = set(["_".join([k.split("_")[2], k.split("_")[4]]) for k in keys_tmp])
            return formatForFlux(keys)

        keys_tmp = [k for k in keys if re.match("^lora_unet_joint_blocks_", k)]
        if len(keys_tmp) > 0:
            # TODO SD3? 38 blocks
            return None

    keys = [k for k in baseKeys if "transformer_blocks" in k and "attentions" in k]
    if len(keys) > 0:
        # TODO unknown
        keys = set([".".join(k.split(".")[2:6]) for k in keys])
        in_blocks = set([f"{k.split('.')[1]}_{k.split('.')[3]}" for k in keys if "down_block" in k])
        mid_block = set([k.split(".")[2] for k in keys if "mid_block" in k])
        out_blocks = set([f"{k.split('.')[1]}_{k.split('.')[3]}" for k in keys if "up_block" in k])
        keys = list(in_blocks) + list(mid_block) + list(out_blocks)
        return None

    keys = [k for k in baseKeys if "transformer_blocks" in k and k.find("transformer") == 0]
    if len(keys) > 0:
        keys = set([".".join(k.split(".")[1:3]) for k in keys])
        keys = [k.replace("single_transformer_blocks.", "single_") for k in keys]
        keys = [k.replace("transformer_blocks.", "double_") for k in keys]
        return formatForFlux(keys)

    return None


def __get_lora_state_keys(filename, force):
    cache_path = f"{os.path.splitext(filename)[0]}.whcache"
    if not force and os.path.exists(cache_path):
        try:
            with open(cache_path, "rb") as f:
                return pickle.load(f)
        except Exception:
            pass

    lora_sd = env.network_lora.load_lora_state_dict(filename)
    keys = list(lora_sd.keys())
    try:
        with open(cache_path, "wb") as f:
            pickle.dump(keys, f)
    except Exception:
        pass
    return keys
