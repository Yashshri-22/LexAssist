import logging
from app.core import settings

log = logging.getLogger("nyayasetu.ai")
_model = None


def _get_model():
    global _model
    if _model is None:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel(settings.gemini_model)
    return _model


def generate(prompt):
    if not settings.gemini_api_key:return ""
    try:
        r = _get_model().generate_content(prompt, request_options={"timeout": 45})
        return (r.text or "").strip()
    except Exception as e:
        log.warning("Gemini request failed: %s", e)
        return ""