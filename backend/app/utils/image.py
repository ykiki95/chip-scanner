"""이미지 검증 및 전처리 유틸"""
from io import BytesIO
from PIL import Image, UnidentifiedImageError


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class InvalidImageError(Exception):
    """업로드된 이미지가 유효하지 않을 때 발생"""


def load_image(raw_bytes: bytes) -> Image.Image:
    """업로드된 raw bytes 를 PIL Image 로 변환하면서 검증한다.

    - 파일 크기 체크
    - 포맷 화이트리스트
    - RGB 변환
    """
    if len(raw_bytes) == 0:
        raise InvalidImageError("빈 파일이 업로드되었습니다.")
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise InvalidImageError("파일 용량이 너무 큽니다.")

    try:
        img = Image.open(BytesIO(raw_bytes))
        img.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("지원하지 않는 이미지 형식입니다.") from exc

    if img.format not in ALLOWED_FORMATS:
        raise InvalidImageError(f"지원하지 않는 포맷입니다: {img.format}")

    if img.mode != "RGB":
        img = img.convert("RGB")

    return img
