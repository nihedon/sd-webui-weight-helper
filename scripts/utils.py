import base64
import cv2
import urllib

import numpy as np
from scripts import env


def get_lora_on_disk(key):
    if env.network_lora:
        lora_on_disk = env.network_lora.available_network_aliases.get(key)
        if not lora_on_disk:
            # sdnext
            lora_on_disk = next((v for v in env.network_lora.available_network_aliases.values() if v.alias == key), None)
        return lora_on_disk
    return None


def imread_unicode(path):
    try:
        with open(path, 'rb') as f:
            data = np.frombuffer(f.read(), np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
        return img
    except Exception as e:
        print(f"imread_unicode error: {e}")
        return None


def resize_to_base64(input_path, target_height):
    output_format = '.webp'
    quality = 85

    img = imread_unicode(input_path)

    h, w = img.shape[:2]
    if h < target_height:
        quoted_filename = urllib.parse.quote(input_path.replace('\\', '/'))
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    scale = target_height / h
    target_size = (int(w * scale), target_height)

    resized = cv2.resize(img, target_size, interpolation=cv2.INTER_AREA)

    sharpen_kernel = np.array([
        [0, -0.2, 0],
        [-0.2, 1.8, -0.2],
        [0, -0.2, 0]
    ])
    sharpened = cv2.filter2D(resized, -1, sharpen_kernel)
    success, buffer = cv2.imencode(output_format, sharpened, [cv2.IMWRITE_WEBP_QUALITY, quality])
    if not success:
        quoted_filename = urllib.parse.quote(input_path.replace('\\', '/'))
        return f"./sd_extra_networks/thumb?filename={quoted_filename}"

    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f'data:image/webp;base64,{base64_str}'
