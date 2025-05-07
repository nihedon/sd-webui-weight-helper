import enum


API_PREFIX = "/whapi/v1"
ALLOWED_PREVIEW_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"]


class UI_TYPE(enum.Enum):
    Unknown = 1
    A1111 = 2
    NEW_FORGE = 3
