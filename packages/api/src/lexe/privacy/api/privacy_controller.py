"""
Privacy API Controller

Provides REST API endpoints for privacy/pseudonymization service:
- PII Detection (detect endpoint)
- Anonymization (anonymize endpoint)
- Batch Processing (batch endpoint)
- Health check with engine availability
- Configuration details
- Supported languages and models
"""

import asyncio
import time
import uuid
from typing import Optional, Dict, Any, List

import structlog
from quart import Blueprint, jsonify, request, g

from llsearch.privacy.config import get_privacy_config
from llsearch.privacy.utils.language_detector import (
    SUPPORTED_LANGUAGES,
    get_supported_languages,
    detect_language
)
from llsearch.privacy.pipeline.orchestrator import PipelineOrchestrator

log = structlog.get_logger(__name__)

# Global orchestrator instance (initialized on first use)
_orchestrator: Optional[PipelineOrchestrator] = None


# ============================================================================
# BLUEPRINT
# ============================================================================

privacy_bp = Blueprint('privacy', __name__, url_prefix='/api/v1/privacy')


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


async def get_orchestrator() -> PipelineOrchestrator:
    """
    Get or initialize the global PipelineOrchestrator instance.

    Lazy initialization ensures orchestrator is only created when needed.

    Returns:
        PipelineOrchestrator instance
    """
    global _orchestrator

    if _orchestrator is None:
        log.info("initializing_orchestrator")
        _orchestrator = PipelineOrchestrator()
        await _orchestrator.initialize()
        log.info("orchestrator_initialized")

    return _orchestrator


def get_current_user_id() -> str:
    """
    Extract current user ID from request context.

    Priority:
    1. From JWT token (g.user_id) - production
    2. From X-User-ID header - development/demo
    3. Fall back to 'anonymous' for unauthenticated requests

    Returns:
        User ID string
    """
    # Option 1: From JWT token (set by authentication middleware)
    if hasattr(g, 'user_id') and g.user_id:
        return g.user_id

    # Option 2: From header (development/demo)
    user_id = request.headers.get('X-User-ID')
    if user_id:
        return user_id

    # Fallback for demo/testing
    return 'anonymous'


def create_success_response(data: Any, metadata: Optional[Dict[str, Any]] = None) -> tuple:
    """
    Create standardized success response.

    Args:
        data: Response data
        metadata: Optional metadata

    Returns:
        Tuple of (response_dict, status_code)
    """
    response = {
        'success': True,
        'data': data
    }

    if metadata:
        response['metadata'] = metadata

    return jsonify(response), 200


def create_error_response(
    code: str,
    message: str,
    status_code: int = 400
) -> tuple:
    """
    Create standardized error response.

    Args:
        code: Error code (e.g., 'VALIDATION_ERROR')
        message: Human-readable error message
        status_code: HTTP status code

    Returns:
        Tuple of (response_dict, status_code)
    """
    response = {
        'success': False,
        'error': {
            'code': code,
            'message': message
        }
    }

    return jsonify(response), status_code


# ============================================================================
# CORE PROCESSING ENDPOINTS
# ============================================================================


@privacy_bp.route('/detect', methods=['POST'])
async def detect_pii():
    """
    POST /api/v1/privacy/detect

    Detect PII entities in text without anonymization.

    Request Body:
        {
            "text": "Mario Rossi vive a Roma...",
            "language": "it",  // Optional, auto-detected if not provided
            "options": {       // Optional
                "confidence_threshold": 0.7
            }
        }

    Response:
        {
            "success": true,
            "data": {
                "entities": [
                    {
                        "text": "Mario Rossi",
                        "type": "PERSON",
                        "start": 0,
                        "end": 11,
                        "confidence": 0.95
                    },
                    ...
                ]
            },
            "metadata": {
                "engine": "presidio",
                "language": "it",
                "fallback_triggered": false,
                "processing_time_ms": 125
            }
        }

    ---
    tags:
      - Privacy Service
    """
    try:
        # 1. Extract and validate request data
        data = await request.get_json()

        if not data:
            return create_error_response(
                'VALIDATION_ERROR',
                'Request body is required'
            )

        text = data.get('text')
        if not text:
            return create_error_response(
                'VALIDATION_ERROR',
                'Missing required field: text'
            )

        # 2. Get user context
        user_id = get_current_user_id()

        # 3. Language detection (auto-detect if not specified)
        language = data.get('language')
        if not language:
            language = detect_language(text)
            log.info('language_auto_detected', language=language, user_id=user_id)

        # 4. Get orchestrator and process document
        orchestrator = await get_orchestrator()

        # Generate document ID for tracking
        document_id = f"detect-{uuid.uuid4().hex[:8]}"

        # Process document (orchestrator returns PipelineResult)
        result = await orchestrator.process_document(
            text=text,
            user_id=user_id,
            document_id=document_id,
            metadata={'operation': 'detect', 'language': language}
        )

        # 5. Format response
        if not result.success:
            return create_error_response(
                'PROCESSING_ERROR',
                result.error_message or 'Detection failed',
                500
            )

        # Convert entities to dict
        entities_data = [entity.to_dict() for entity in result.entities]

        response_data = {
            'entities': entities_data
        }

        response_metadata = {
            'engine': result.metadata.get('primary_engine', 'unknown'),
            'language': language,
            'fallback_triggered': result.metadata.get('fallback_triggered', False),
            'processing_time_ms': result.processing_time_ms
        }

        log.info(
            'detect_pii_completed',
            user_id=user_id,
            document_id=document_id,
            entities_count=len(result.entities),
            language=language,
            processing_time_ms=result.processing_time_ms
        )

        return create_success_response(response_data, response_metadata)

    except Exception as e:
        log.error('detect_pii_error', error=str(e), exc_info=True)
        return create_error_response(
            'INTERNAL_ERROR',
            f'Detection failed: {str(e)}',
            500
        )


@privacy_bp.route('/anonymize', methods=['POST'])
async def anonymize_text():
    """
    POST /api/v1/privacy/anonymize

    Detect and anonymize PII in text.

    Request Body:
        {
            "text": "Mario Rossi, CF: RSSMRA80A01H501Z...",
            "language": "it",  // Optional, auto-detected if not provided
            "strategy": "deterministic",  // Optional: deterministic, synthetic, redaction, hash
            "options": {       // Optional
                "confidence_threshold": 0.7,
                "consistent_replacement": true
            }
        }

    Response:
        {
            "success": true,
            "data": {
                "anonymized_text": "[PERSON_1], CF: [IT_FISCAL_CODE_1]...",
                "entities": [
                    {
                        "text": "Mario Rossi",
                        "type": "PERSON",
                        "start": 0,
                        "end": 11,
                        "confidence": 0.95
                    },
                    ...
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

    ---
    tags:
      - Privacy Service
    """
    try:
        # 1. Extract and validate request data
        data = await request.get_json()

        if not data:
            return create_error_response(
                'VALIDATION_ERROR',
                'Request body is required'
            )

        text = data.get('text')
        if not text:
            return create_error_response(
                'VALIDATION_ERROR',
                'Missing required field: text'
            )

        # 2. Get user context
        user_id = get_current_user_id()

        # 3. Language detection (auto-detect if not specified)
        language = data.get('language')
        if not language:
            language = detect_language(text)
            log.info('language_auto_detected', language=language, user_id=user_id)

        # 4. Strategy parameter (optional, default handled by orchestrator)
        strategy = data.get('strategy', 'deterministic')

        # 5. Get orchestrator and process document
        orchestrator = await get_orchestrator()

        # Generate document ID for tracking
        document_id = f"anonymize-{uuid.uuid4().hex[:8]}"

        # Process document (orchestrator handles both detection and anonymization)
        result = await orchestrator.process_document(
            text=text,
            user_id=user_id,
            document_id=document_id,
            metadata={
                'operation': 'anonymize',
                'language': language,
                'strategy': strategy
            }
        )

        # 6. Format response
        if not result.success:
            return create_error_response(
                'PROCESSING_ERROR',
                result.error_message or 'Anonymization failed',
                500
            )

        # Convert entities to dict
        entities_data = [entity.to_dict() for entity in result.entities]

        response_data = {
            'anonymized_text': result.anonymized_text,
            'entities': entities_data
        }

        response_metadata = {
            'engine': result.metadata.get('primary_engine', 'unknown'),
            'language': language,
            'strategy': strategy,
            'fallback_triggered': result.metadata.get('fallback_triggered', False),
            'processing_time_ms': result.processing_time_ms
        }

        log.info(
            'anonymize_text_completed',
            user_id=user_id,
            document_id=document_id,
            entities_count=len(result.entities),
            language=language,
            strategy=strategy,
            processing_time_ms=result.processing_time_ms
        )

        return create_success_response(response_data, response_metadata)

    except Exception as e:
        log.error('anonymize_text_error', error=str(e), exc_info=True)
        return create_error_response(
            'INTERNAL_ERROR',
            f'Anonymization failed: {str(e)}',
            500
        )


@privacy_bp.route('/batch', methods=['POST'])
async def batch_process():
    """
    POST /api/v1/privacy/batch

    Process multiple documents in parallel.

    Request Body:
        {
            "documents": [
                {
                    "id": "doc1",
                    "text": "Mario Rossi..."
                },
                {
                    "id": "doc2",
                    "text": "Luigi Bianchi..."
                }
            ],
            "operation": "anonymize",  // "detect" or "anonymize"
            "language": "it",          // Optional, auto-detected per document
            "strategy": "deterministic" // Optional, for anonymize operation
        }

    Response:
        {
            "success": true,
            "data": {
                "results": [
                    {
                        "id": "doc1",
                        "success": true,
                        "anonymized_text": "...",
                        "entities": [...],
                        "processing_time_ms": 120
                    },
                    ...
                ],
                "summary": {
                    "total_documents": 2,
                    "successful": 2,
                    "failed": 0,
                    "total_entities_detected": 15,
                    "total_processing_time_ms": 350
                }
            },
            "metadata": {
                "engine": "presidio",
                "language": "it",
                "operation": "anonymize"
            }
        }

    ---
    tags:
      - Privacy Service
    """
    try:
        # 1. Extract and validate request data
        data = await request.get_json()

        if not data:
            return create_error_response(
                'VALIDATION_ERROR',
                'Request body is required'
            )

        documents = data.get('documents')
        if not documents or not isinstance(documents, list):
            return create_error_response(
                'VALIDATION_ERROR',
                'Missing or invalid field: documents (must be array)'
            )

        if len(documents) == 0:
            return create_error_response(
                'VALIDATION_ERROR',
                'documents array cannot be empty'
            )

        operation = data.get('operation', 'anonymize')
        if operation not in ['detect', 'anonymize']:
            return create_error_response(
                'VALIDATION_ERROR',
                'operation must be "detect" or "anonymize"'
            )

        # 2. Get user context
        user_id = get_current_user_id()

        # 3. Global settings
        global_language = data.get('language')
        strategy = data.get('strategy', 'deterministic')

        # 4. Get orchestrator
        orchestrator = await get_orchestrator()

        # 5. Prepare documents for batch processing
        batch_docs = []
        for doc in documents:
            doc_id = doc.get('id')
            doc_text = doc.get('text')

            if not doc_id:
                return create_error_response(
                    'VALIDATION_ERROR',
                    'Each document must have an "id" field'
                )

            if not doc_text:
                return create_error_response(
                    'VALIDATION_ERROR',
                    f'Document {doc_id} missing "text" field'
                )

            # Auto-detect language for each document if not globally specified
            doc_language = global_language or detect_language(doc_text)

            batch_docs.append({
                'text': doc_text,
                'document_id': doc_id,
                'metadata': {
                    'operation': operation,
                    'language': doc_language,
                    'strategy': strategy
                }
            })

        # 6. Process batch
        batch_result = await orchestrator.process_batch(
            documents=batch_docs,
            user_id=user_id
        )

        # 7. Format response
        results_data = []
        for i, result in enumerate(batch_result.results):
            doc_id = batch_docs[i]['document_id']

            result_dict = {
                'id': doc_id,
                'success': result.success,
                'processing_time_ms': result.processing_time_ms
            }

            if result.success:
                result_dict['entities'] = [e.to_dict() for e in result.entities]

                if operation == 'anonymize':
                    result_dict['anonymized_text'] = result.anonymized_text
            else:
                result_dict['error'] = result.error_message

            results_data.append(result_dict)

        summary = {
            'total_documents': batch_result.total_documents,
            'successful': batch_result.successful,
            'failed': batch_result.failed,
            'total_entities_detected': batch_result.total_entities_detected,
            'total_processing_time_ms': batch_result.total_processing_time_ms
        }

        response_data = {
            'results': results_data,
            'summary': summary
        }

        response_metadata = {
            'engine': get_privacy_config().default_engine,
            'language': global_language or 'auto-detected',
            'operation': operation
        }

        log.info(
            'batch_process_completed',
            user_id=user_id,
            operation=operation,
            total_documents=batch_result.total_documents,
            successful=batch_result.successful,
            failed=batch_result.failed,
            total_entities=batch_result.total_entities_detected,
            total_time_ms=batch_result.total_processing_time_ms
        )

        return create_success_response(response_data, response_metadata)

    except Exception as e:
        log.error('batch_process_error', error=str(e), exc_info=True)
        return create_error_response(
            'INTERNAL_ERROR',
            f'Batch processing failed: {str(e)}',
            500
        )


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================


@privacy_bp.route('/health', methods=['GET'])
async def health_check():
    """
    Health check endpoint for privacy service.

    Returns the availability status of PII detection engines and supported languages.

    Returns:
        JSON response with service status and engine availability

    Example response:
        {
            "status": "healthy",
            "service": "privacy-api",
            "engines": {
                "presidio": "available",
                "spacy": "available"
            },
            "languages": ["it", "en", "fr", "es", "de", "pt"]
        }

    ---
    tags:
      - Privacy Service
    responses:
      200:
        description: Privacy service is healthy
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: "healthy"
                service:
                  type: string
                  example: "privacy-api"
                engines:
                  type: object
                  properties:
                    presidio:
                      type: string
                      example: "available"
                    spacy:
                      type: string
                      example: "available"
                languages:
                  type: array
                  items:
                    type: string
                  example: ["it", "en", "fr", "es", "de", "pt"]
    """
    try:
        config = get_privacy_config()

        # Check engine availability based on configuration
        engines_status = {}
        if config.presidio.enabled:
            engines_status['presidio'] = 'available'
        else:
            engines_status['presidio'] = 'disabled'

        if config.spacy.enabled:
            engines_status['spacy'] = 'available'
        else:
            engines_status['spacy'] = 'disabled'

        response = {
            'status': 'healthy',
            'service': 'privacy-api',
            'engines': engines_status,
            'languages': get_supported_languages()
        }

        log.info('privacy_health_check', engines=engines_status)
        return jsonify(response), 200

    except Exception as e:
        log.error('privacy_health_check_error', error=str(e), exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'service': 'privacy-api',
            'error': str(e)
        }), 500


@privacy_bp.route('/config', methods=['GET'])
async def get_config():
    """
    Get current privacy service configuration.

    Returns the active configuration for both PII detection engines,
    supported languages, and detection thresholds.

    Returns:
        JSON response with configuration details

    Example response:
        {
            "default_engine": "presidio",
            "fallback_engine": "spacy",
            "supported_languages": ["it", "en", "fr", "es", "de", "pt"],
            "auto_detect_language": true,
            "confidence_threshold": 0.7,
            "low_confidence_threshold": 0.6
        }

    ---
    tags:
      - Privacy Service
    responses:
      200:
        description: Privacy service configuration
        content:
          application/json:
            schema:
              type: object
              properties:
                default_engine:
                  type: string
                  example: "presidio"
                fallback_engine:
                  type: string
                  example: "spacy"
                supported_languages:
                  type: array
                  items:
                    type: string
                  example: ["it", "en", "fr", "es", "de", "pt"]
                auto_detect_language:
                  type: boolean
                  example: true
                confidence_threshold:
                  type: number
                  format: float
                  example: 0.7
                low_confidence_threshold:
                  type: number
                  format: float
                  example: 0.6
    """
    try:
        config = get_privacy_config()

        response = {
            'default_engine': config.default_engine,
            'fallback_engine': config.fallback_engine,
            'supported_languages': config.presidio.supported_languages,
            'auto_detect_language': config.presidio.auto_detect_language,
            'confidence_threshold': config.presidio.confidence_threshold,
            'low_confidence_threshold': config.monitoring.low_confidence_threshold
        }

        log.info('privacy_get_config', default_engine=config.default_engine)
        return jsonify(response), 200

    except Exception as e:
        log.error('privacy_get_config_error', error=str(e), exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve configuration',
            'message': str(e)
        }), 500


@privacy_bp.route('/languages', methods=['GET'])
async def get_languages():
    """
    Get supported languages with model information.

    Returns detailed information about each supported language including
    the language code, name, and spaCy model name.

    Returns:
        JSON response with language details

    Example response:
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
                ...
            ]
        }

    ---
    tags:
      - Privacy Service
    responses:
      200:
        description: Supported languages with model information
        content:
          application/json:
            schema:
              type: object
              properties:
                languages:
                  type: array
                  items:
                    type: object
                    properties:
                      code:
                        type: string
                        description: ISO 639-1 language code
                        example: "it"
                      name:
                        type: string
                        description: Language name in English
                        example: "Italian"
                      model:
                        type: string
                        description: spaCy model name
                        example: "it_core_news_lg"
    """
    try:
        # Language metadata mapping
        language_names = {
            'it': 'Italian',
            'en': 'English',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German',
            'pt': 'Portuguese'
        }

        languages_list = []
        for code in get_supported_languages():
            languages_list.append({
                'code': code,
                'name': language_names.get(code, code.upper()),
                'model': SUPPORTED_LANGUAGES.get(code, '')
            })

        # Sort by code for consistency
        languages_list.sort(key=lambda x: x['code'])

        response = {
            'languages': languages_list
        }

        log.info('privacy_get_languages', count=len(languages_list))
        return jsonify(response), 200

    except Exception as e:
        log.error('privacy_get_languages_error', error=str(e), exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve language information',
            'message': str(e)
        }), 500
