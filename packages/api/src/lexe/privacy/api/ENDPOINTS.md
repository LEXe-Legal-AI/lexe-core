# Privacy API Utility Endpoints

This document describes the Privacy API utility endpoints for service information.

## Base URL
```
/api/v1/privacy
```

## Endpoints

### 1. Health Check
Check the health status of the privacy service and engine availability.

**Endpoint:** `GET /api/v1/privacy/health`

**Response (200 OK):**
```json
{
    "status": "healthy",
    "service": "privacy-api",
    "engines": {
        "presidio": "available",
        "spacy": "available"
    },
    "languages": ["it", "en", "fr", "es", "de", "pt"]
}
```

**Error Response (500):**
```json
{
    "status": "unhealthy",
    "service": "privacy-api",
    "error": "Error message"
}
```

**Usage:**
```bash
curl http://localhost:5000/api/v1/privacy/health
```

---

### 2. Get Configuration
Retrieve the current privacy service configuration including engines, languages, and thresholds.

**Endpoint:** `GET /api/v1/privacy/config`

**Response (200 OK):**
```json
{
    "default_engine": "presidio",
    "fallback_engine": "spacy",
    "supported_languages": ["it", "en", "fr", "es", "de", "pt"],
    "auto_detect_language": true,
    "confidence_threshold": 0.7,
    "low_confidence_threshold": 0.6
}
```

**Error Response (500):**
```json
{
    "error": "Failed to retrieve configuration",
    "message": "Error message"
}
```

**Usage:**
```bash
curl http://localhost:5000/api/v1/privacy/config
```

---

### 3. Get Supported Languages
Get detailed information about all supported languages including model names.

**Endpoint:** `GET /api/v1/privacy/languages`

**Response (200 OK):**
```json
{
    "languages": [
        {
            "code": "de",
            "name": "German",
            "model": "de_core_news_lg"
        },
        {
            "code": "en",
            "name": "English",
            "model": "en_core_web_lg"
        },
        {
            "code": "es",
            "name": "Spanish",
            "model": "es_core_news_lg"
        },
        {
            "code": "fr",
            "name": "French",
            "model": "fr_core_news_lg"
        },
        {
            "code": "it",
            "name": "Italian",
            "model": "it_core_news_lg"
        },
        {
            "code": "pt",
            "name": "Portuguese",
            "model": "pt_core_news_lg"
        }
    ]
}
```

**Error Response (500):**
```json
{
    "error": "Failed to retrieve language information",
    "message": "Error message"
}
```

**Usage:**
```bash
curl http://localhost:5000/api/v1/privacy/languages
```

---

## Configuration Details

### Default Engine: Presidio
- **Status:** Available (if enabled in config)
- **Reason:** Winner of benchmarking tests (F1=0.058 vs spaCy F1=0.026)
- **Features:**
  - Custom Italian recognizers (CF, P.IVA)
  - Multi-language support
  - Advanced entity detection
  - Configurable anonymization strategies

### Fallback Engine: spaCy
- **Status:** Available (if enabled in config)
- **Model:** Italian `it_core_news_lg` (primary)
- **Features:**
  - NER-based detection
  - Custom recognizers for Italian legal documents
  - Fallback when Presidio is unavailable

### Supported Languages
1. **Italian (it)** - `it_core_news_lg`
2. **English (en)** - `en_core_web_lg`
3. **French (fr)** - `fr_core_news_lg`
4. **Spanish (es)** - `es_core_news_lg`
5. **German (de)** - `de_core_news_lg`
6. **Portuguese (pt)** - `pt_core_news_lg`

### Configuration Parameters
- **default_engine:** Primary PII detection engine (presidio)
- **fallback_engine:** Secondary engine for failover (spacy)
- **auto_detect_language:** Automatically detect document language (default: true)
- **confidence_threshold:** Minimum confidence for entity detection (default: 0.7)
- **low_confidence_threshold:** Threshold for alerting on low confidence (default: 0.6)

---

## Example Usage

### Python (using requests)
```python
import requests

# Health check
response = requests.get('http://localhost:5000/api/v1/privacy/health')
print(response.json())

# Get config
response = requests.get('http://localhost:5000/api/v1/privacy/config')
print(response.json())

# Get languages
response = requests.get('http://localhost:5000/api/v1/privacy/languages')
print(response.json())
```

### JavaScript (using fetch)
```javascript
// Health check
fetch('http://localhost:5000/api/v1/privacy/health')
  .then(r => r.json())
  .then(data => console.log(data));

// Get config
fetch('http://localhost:5000/api/v1/privacy/config')
  .then(r => r.json())
  .then(data => console.log(data));

// Get languages
fetch('http://localhost:5000/api/v1/privacy/languages')
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## Error Handling

All endpoints may return a 500 error if there's an issue retrieving the information:

```json
{
    "error": "Error category",
    "message": "Detailed error message"
}
```

Common causes:
- Configuration file not accessible
- Privacy module not properly initialized
- Language detection utilities not available

---

## Implementation Details

### Files
- **Controller:** `src/llsearch/privacy/api/privacy_controller.py`
- **Blueprint Registration:** `src/llsearch/app.py` (registered in `_setup_routes()`)
- **Module Init:** `src/llsearch/privacy/api/__init__.py`

### Dependencies
- **Config:** `llsearch.privacy.config.get_privacy_config()`
- **Languages:** `llsearch.privacy.utils.language_detector` (SUPPORTED_LANGUAGES, get_supported_languages)

### Logging
All endpoints use structlog for detailed request logging:
- `privacy_health_check` - Health check events
- `privacy_get_config` - Configuration retrieval events
- `privacy_get_languages` - Language information events
- `*_error` variants - Error events with full exception info

---

## Integration with Other Modules

These endpoints are designed to work with:
- **Privacy Pipeline:** For orchestrating PII detection and anonymization
- **Monitoring System:** For tracking privacy events in the dashboard
- **Admin Dashboard:** For displaying privacy service status
- **Configuration Management:** For dynamically updating privacy settings

---

## Future Enhancements

Potential endpoints for future implementation:
- `POST /detect` - Detect PII in text
- `POST /anonymize` - Anonymize PII in text
- `POST /batch` - Batch processing of documents
- `GET /stats` - Statistics on detection performance
- `PUT /config` - Update configuration (admin only)
