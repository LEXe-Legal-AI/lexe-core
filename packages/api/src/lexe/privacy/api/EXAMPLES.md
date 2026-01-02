# Privacy API Examples

## 1. POST /api/v1/privacy/detect

**Description**: Detect PII entities in text without anonymization.

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/privacy/detect \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "text": "Mario Rossi abita a Roma, il suo CF è RSSMRA80A01H501Z e la sua email è mario.rossi@example.com",
    "language": "it"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "entities": [
      {
        "text": "Mario Rossi",
        "type": "PERSON",
        "start": 0,
        "end": 11,
        "confidence": 0.95,
        "context_before": null,
        "context_after": " abita a",
        "metadata": {}
      },
      {
        "text": "Roma",
        "type": "LOC",
        "start": 22,
        "end": 26,
        "confidence": 0.92,
        "context_before": " a ",
        "context_after": ", il",
        "metadata": {}
      },
      {
        "text": "RSSMRA80A01H501Z",
        "type": "CF",
        "start": 43,
        "end": 59,
        "confidence": 0.98,
        "context_before": "CF è ",
        "context_after": " e la",
        "metadata": {}
      },
      {
        "text": "mario.rossi@example.com",
        "type": "EMAIL",
        "start": 78,
        "end": 101,
        "confidence": 1.0,
        "context_before": "email è ",
        "context_after": null,
        "metadata": {}
      }
    ]
  },
  "metadata": {
    "engine": "presidio",
    "language": "it",
    "fallback_triggered": false,
    "processing_time_ms": 125
  }
}
```

---

## 2. POST /api/v1/privacy/anonymize

**Description**: Detect and anonymize PII in text.

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/privacy/anonymize \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "text": "Mario Rossi abita a Roma, il suo CF è RSSMRA80A01H501Z e la sua email è mario.rossi@example.com",
    "language": "it",
    "strategy": "deterministic"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "anonymized_text": "[PERSON_1] abita a [LOC_1], il suo CF è [CF_1] e la sua email è [EMAIL_1]",
    "entities": [
      {
        "text": "Mario Rossi",
        "type": "PERSON",
        "start": 0,
        "end": 11,
        "confidence": 0.95,
        "context_before": null,
        "context_after": " abita a",
        "metadata": {}
      },
      {
        "text": "Roma",
        "type": "LOC",
        "start": 22,
        "end": 26,
        "confidence": 0.92,
        "context_before": " a ",
        "context_after": ", il",
        "metadata": {}
      },
      {
        "text": "RSSMRA80A01H501Z",
        "type": "CF",
        "start": 43,
        "end": 59,
        "confidence": 0.98,
        "context_before": "CF è ",
        "context_after": " e la",
        "metadata": {}
      },
      {
        "text": "mario.rossi@example.com",
        "type": "EMAIL",
        "start": 78,
        "end": 101,
        "confidence": 1.0,
        "context_before": "email è ",
        "context_after": null,
        "metadata": {}
      }
    ]
  },
  "metadata": {
    "engine": "presidio",
    "language": "it",
    "strategy": "deterministic",
    "fallback_triggered": false,
    "processing_time_ms": 145
  }
}
```

---

## 3. POST /api/v1/privacy/batch

**Description**: Process multiple documents in parallel.

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/privacy/batch \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "documents": [
      {
        "id": "doc1",
        "text": "Mario Rossi, CF: RSSMRA80A01H501Z"
      },
      {
        "id": "doc2",
        "text": "Luigi Bianchi, email: luigi@example.com"
      }
    ],
    "operation": "anonymize",
    "language": "it",
    "strategy": "deterministic"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc1",
        "success": true,
        "anonymized_text": "[PERSON_1], CF: [CF_1]",
        "entities": [
          {
            "text": "Mario Rossi",
            "type": "PERSON",
            "start": 0,
            "end": 11,
            "confidence": 0.95,
            "context_before": null,
            "context_after": ", CF:",
            "metadata": {}
          },
          {
            "text": "RSSMRA80A01H501Z",
            "type": "CF",
            "start": 17,
            "end": 33,
            "confidence": 0.98,
            "context_before": "CF: ",
            "context_after": null,
            "metadata": {}
          }
        ],
        "processing_time_ms": 120
      },
      {
        "id": "doc2",
        "success": true,
        "anonymized_text": "[PERSON_1], email: [EMAIL_1]",
        "entities": [
          {
            "text": "Luigi Bianchi",
            "type": "PERSON",
            "start": 0,
            "end": 13,
            "confidence": 0.93,
            "context_before": null,
            "context_after": ", email:",
            "metadata": {}
          },
          {
            "text": "luigi@example.com",
            "type": "EMAIL",
            "start": 22,
            "end": 39,
            "confidence": 1.0,
            "context_before": "email: ",
            "context_after": null,
            "metadata": {}
          }
        ],
        "processing_time_ms": 115
      }
    ],
    "summary": {
      "total_documents": 2,
      "successful": 2,
      "failed": 0,
      "total_entities_detected": 4,
      "total_processing_time_ms": 350
    }
  },
  "metadata": {
    "engine": "presidio",
    "language": "it",
    "operation": "anonymize"
  }
}
```

---

## Error Examples

### 1. Missing Required Field

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/privacy/detect \
  -H "Content-Type: application/json" \
  -d '{
    "language": "it"
  }'
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: text"
  }
}
```

### 2. Processing Error

**Request**: (with invalid text that causes engine failure)

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Detection failed"
  }
}
```

### 3. Invalid Operation

**Request**:
```bash
curl -X POST http://localhost:5000/api/v1/privacy/batch \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [...],
    "operation": "invalid_op"
  }'
```

**Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "operation must be \"detect\" or \"anonymize\""
  }
}
```

---

## Utility Endpoints

### GET /api/v1/privacy/health

**Request**:
```bash
curl http://localhost:5000/api/v1/privacy/health
```

**Response**:
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

### GET /api/v1/privacy/config

**Request**:
```bash
curl http://localhost:5000/api/v1/privacy/config
```

**Response**:
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

### GET /api/v1/privacy/languages

**Request**:
```bash
curl http://localhost:5000/api/v1/privacy/languages
```

**Response**:
```json
{
  "languages": [
    {
      "code": "it",
      "name": "Italian",
      "model": "it_core_news_lg"
    },
    {
      "code": "en",
      "name": "English",
      "model": "en_core_web_lg"
    },
    {
      "code": "fr",
      "name": "French",
      "model": "fr_core_news_lg"
    },
    {
      "code": "es",
      "name": "Spanish",
      "model": "es_core_news_lg"
    },
    {
      "code": "de",
      "name": "German",
      "model": "de_core_news_lg"
    },
    {
      "code": "pt",
      "name": "Portuguese",
      "model": "pt_core_news_lg"
    }
  ]
}
```
