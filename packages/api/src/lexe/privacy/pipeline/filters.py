"""
Filter functions for text preprocessing before PII detection

These filters prepare legal documents for entity detection by:
- Normalizing text (whitespace, unicode, case)
- Detecting document context (type, jurisdiction)
- Validating detected entities (CF, P.IVA checksums)
- Matching legal patterns (formulas, citations)
- Scoring entity sensitivity (high/medium/low risk)
"""

import re
import unicodedata
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

import structlog

from .base_pipeline import DetectedEntity, EntityType

logger = structlog.get_logger(__name__)


class DocumentType(Enum):
    """Legal document types"""
    SENTENZA = "sentenza"  # Court decision
    CONTRATTO = "contratto"  # Contract
    ATTO = "atto"  # Legal act
    VERBALE = "verbale"  # Minutes/transcript
    PARERE = "parere"  # Legal opinion
    RICORSO = "ricorso"  # Appeal
    CITAZIONE = "citazione"  # Citation
    UNKNOWN = "unknown"


class SensitivityLevel(Enum):
    """Entity sensitivity levels for GDPR compliance"""
    HIGH = "high"  # CF, health data, judicial data
    MEDIUM = "medium"  # Names, addresses
    LOW = "low"  # Organizations, public entities


# ============================================================================
# 1. Text Normalization
# ============================================================================

def normalize_text(
    text: str,
    lowercase: bool = False,
    remove_extra_whitespace: bool = True,
    normalize_unicode: bool = True,
    preserve_newlines: bool = True,
) -> str:
    """
    Normalize text while preserving important structure

    Args:
        text: Input text
        lowercase: Convert to lowercase (False for legal docs to preserve proper nouns)
        remove_extra_whitespace: Remove extra spaces/tabs
        normalize_unicode: Normalize unicode to NFC form
        preserve_newlines: Keep newlines for paragraph structure

    Returns:
        Normalized text
    """
    if not text:
        return text

    # Unicode normalization (NFC - composed form)
    if normalize_unicode:
        text = unicodedata.normalize('NFC', text)

    # Remove extra whitespace
    if remove_extra_whitespace:
        if preserve_newlines:
            # Replace multiple spaces/tabs but keep single newlines
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n\s+\n', '\n\n', text)  # Multiple newlines → double
        else:
            text = re.sub(r'\s+', ' ', text)

    # Lowercase (NOT recommended for legal docs)
    if lowercase:
        text = text.lower()

    # Strip leading/trailing whitespace
    text = text.strip()

    logger.debug("text_normalized", length=len(text), lowercase=lowercase)
    return text


# ============================================================================
# 2. Context Detection
# ============================================================================

@dataclass
class DocumentContext:
    """Detected document context"""
    document_type: DocumentType
    jurisdiction: Optional[str] = None  # "civile", "penale", "amministrativo"
    court: Optional[str] = None  # "Tribunale di Milano", "Corte di Cassazione"
    date: Optional[str] = None
    confidence: float = 1.0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


def detect_context(text: str, max_chars: int = 2000) -> DocumentContext:
    """
    Detect document type and legal context from text

    Analyzes the first `max_chars` characters to identify:
    - Document type (sentenza, contratto, atto, etc.)
    - Jurisdiction (civile, penale, amministrativo)
    - Court name if present

    Args:
        text: Input text
        max_chars: Maximum characters to analyze

    Returns:
        DocumentContext with detected information
    """
    # Analyze only beginning of document (headers usually at top)
    sample = text[:max_chars].lower()

    # Detect document type
    doc_type = DocumentType.UNKNOWN
    confidence = 0.5

    if any(keyword in sample for keyword in ['sentenza', 'corte', 'tribunale', 'giudice']):
        doc_type = DocumentType.SENTENZA
        confidence = 0.9
    elif any(keyword in sample for keyword in ['contratto', 'accordo', 'tra le parti']):
        doc_type = DocumentType.CONTRATTO
        confidence = 0.9
    elif any(keyword in sample for keyword in ['atto', 'notaio', 'rogito']):
        doc_type = DocumentType.ATTO
        confidence = 0.8
    elif any(keyword in sample for keyword in ['verbale', 'assemblea', 'seduta']):
        doc_type = DocumentType.VERBALE
        confidence = 0.8
    elif any(keyword in sample for keyword in ['parere', 'opinione legale', 'quesito']):
        doc_type = DocumentType.PARERE
        confidence = 0.8
    elif any(keyword in sample for keyword in ['ricorso', 'impugnazione', 'gravame']):
        doc_type = DocumentType.RICORSO
        confidence = 0.9

    # Detect jurisdiction
    jurisdiction = None
    if 'civile' in sample or 'c.c.' in sample:
        jurisdiction = 'civile'
    elif 'penale' in sample or 'c.p.' in sample:
        jurisdiction = 'penale'
    elif 'amministrativo' in sample or 'tar' in sample:
        jurisdiction = 'amministrativo'

    # Extract court name
    court = None
    court_patterns = [
        r'(corte\s+(?:di\s+)?cassazione)',
        r'(tribunale\s+(?:di\s+)?[\w\s]+)',
        r"(corte\s+d['']appello\s+(?:di\s+)?[\w\s]+)",
        r'(tar\s+[\w\s]+)',
    ]
    for pattern in court_patterns:
        match = re.search(pattern, sample, re.IGNORECASE)
        if match:
            court = match.group(1).strip()
            break

    logger.debug(
        "context_detected",
        document_type=doc_type.value,
        jurisdiction=jurisdiction,
        court=court,
        confidence=confidence,
    )

    return DocumentContext(
        document_type=doc_type,
        jurisdiction=jurisdiction,
        court=court,
        confidence=confidence,
    )


# ============================================================================
# 3. Entity Validation
# ============================================================================

def validate_italian_fiscal_code(cf: str) -> bool:
    """
    Validate Italian Codice Fiscale (CF) with checksum

    CF format: 16 alphanumeric characters
    Example: RSSMRA85T10A562S

    Args:
        cf: Codice Fiscale string

    Returns:
        True if valid
    """
    cf = cf.upper().strip()

    # Length check
    if len(cf) != 16:
        return False

    # Format check: LLLLLLNNLNNLNNNL
    pattern = r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$'
    if not re.match(pattern, cf):
        return False

    # Checksum validation
    # Odd positions use this mapping for digits
    odd_digit_values = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21]  # For digits 0-9
    odd_chars = "BAFHJNPRTVCESULDGIMOQKWZYX"
    even_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    check_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    total = 0
    for i, char in enumerate(cf[:15]):
        if i % 2 == 0:  # Odd position (0-indexed)
            if char.isdigit():
                total += odd_digit_values[int(char)]
            else:
                total += odd_chars.index(char)
        else:  # Even position
            if char.isdigit():
                total += int(char)
            else:
                total += even_chars.index(char)

    expected_check = check_chars[total % 26]
    actual_check = cf[15]

    is_valid = expected_check == actual_check
    logger.debug("cf_validated", cf=cf[:4] + "***", valid=is_valid)
    return is_valid


def validate_italian_vat(piva: str) -> bool:
    """
    Validate Italian Partita IVA (P.IVA) with checksum

    P.IVA format: 11 digits
    Example: 12345678901

    Args:
        piva: Partita IVA string

    Returns:
        True if valid
    """
    piva = piva.strip()

    # Remove common prefixes
    piva = piva.replace('IT', '').replace('it', '')

    # Length check
    if len(piva) != 11:
        return False

    # Digits only
    if not piva.isdigit():
        return False

    # Checksum validation (Luhn algorithm)
    total = 0
    for i, digit in enumerate(piva[:10]):
        n = int(digit)
        if i % 2 == 1:  # Even position (0-indexed)
            n *= 2
            if n > 9:
                n = n // 10 + n % 10
        total += n

    check_digit = (10 - (total % 10)) % 10
    is_valid = check_digit == int(piva[10])

    logger.debug("piva_validated", piva=piva[:4] + "***", valid=is_valid)
    return is_valid


def validate_email(email: str) -> bool:
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_italian_phone(phone: str) -> bool:
    """
    Validate Italian phone number

    Formats:
    - Mobile: +39 3XX XXXXXXX
    - Landline: +39 0X XXXXXXXX
    """
    # Remove spaces, dashes, parentheses
    phone = re.sub(r'[\s\-\(\)]', '', phone)

    # Check with/without country code
    patterns = [
        r'^\+39[0-9]{9,10}$',  # With +39
        r'^0039[0-9]{9,10}$',  # With 0039
        r'^[0-9]{9,10}$',  # Without country code
    ]

    return any(re.match(pattern, phone) for pattern in patterns)


def validate_entities(entities: List[DetectedEntity]) -> List[DetectedEntity]:
    """
    Validate detected entities and filter invalid ones

    Applies validation rules:
    - CF: 16 chars + checksum
    - P.IVA: 11 digits + checksum
    - Email: regex validation
    - Phone: Italian format

    Args:
        entities: List of detected entities

    Returns:
        List of validated entities (invalid ones filtered out)
    """
    validated = []

    for entity in entities:
        is_valid = True

        # Apply type-specific validation
        if entity.type == EntityType.FISCAL_CODE:
            is_valid = validate_italian_fiscal_code(entity.text)
        elif entity.type == EntityType.VAT_NUMBER:
            is_valid = validate_italian_vat(entity.text)
        elif entity.type == EntityType.EMAIL:
            is_valid = validate_email(entity.text)
        elif entity.type == EntityType.PHONE:
            is_valid = validate_italian_phone(entity.text)

        if is_valid:
            validated.append(entity)
        else:
            logger.debug(
                "entity_invalid",
                type=entity.type.value,
                text=entity.text[:10] + "***",
            )

    logger.info(
        "entities_validated",
        original_count=len(entities),
        validated_count=len(validated),
        filtered_count=len(entities) - len(validated),
    )

    return validated


# ============================================================================
# 4. Legal Pattern Matching
# ============================================================================

# Common legal formulas to exclude from PII detection
LEGAL_FORMULAS = [
    r"ai sensi dell['']art\.",
    r'in conformità a quanto previsto',
    r'così come disposto',
    r'nel rispetto di',
    r'in ottemperanza a',
    r'visto il',
    r'considerato che',
    r'ritenuto in fatto ed in diritto',
]


def legal_pattern_matcher(text: str, entities: List[DetectedEntity]) -> List[DetectedEntity]:
    """
    Filter out entities that are part of legal formulas/citations

    Legal texts contain standard formulas that should NOT be anonymized:
    - "ai sensi dell'art. 123"
    - "visto il D.Lgs. 196/2003"
    - "Tribunale di Milano" (when referring to court, not entity)

    Args:
        text: Original text
        entities: Detected entities

    Returns:
        Filtered entities (legal formulas excluded)
    """
    filtered = []

    for entity in entities:
        # Extract context around entity
        context_start = max(0, entity.start - 50)
        context_end = min(len(text), entity.end + 50)
        context = text[context_start:context_end].lower()

        # Check if entity is within a legal formula
        is_formula = any(
            re.search(pattern, context, re.IGNORECASE)
            for pattern in LEGAL_FORMULAS
        )

        if not is_formula:
            filtered.append(entity)
        else:
            logger.debug(
                "entity_filtered_formula",
                type=entity.type.value,
                text=entity.text[:20],
            )

    logger.debug(
        "legal_patterns_filtered",
        original_count=len(entities),
        filtered_count=len(filtered),
    )

    return filtered


# ============================================================================
# 5. Sensitivity Scoring
# ============================================================================

def sensitivity_scorer(entities: List[DetectedEntity]) -> List[DetectedEntity]:
    """
    Assign sensitivity level to each entity for GDPR compliance

    Sensitivity levels (GDPR Art. 9):
    - HIGH: CF, health data, judicial data, biometric
    - MEDIUM: Names, addresses, contact info
    - LOW: Organizations, public entities

    Args:
        entities: List of detected entities

    Returns:
        Entities with sensitivity score in metadata
    """
    for entity in entities:
        # Determine sensitivity level based on type
        if entity.type in [EntityType.FISCAL_CODE, EntityType.ID_CARD, EntityType.PASSPORT]:
            level = SensitivityLevel.HIGH
        elif entity.type in [EntityType.PERSON, EntityType.ADDRESS, EntityType.EMAIL, EntityType.PHONE]:
            level = SensitivityLevel.MEDIUM
        elif entity.type in [EntityType.ORGANIZATION, EntityType.COURT]:
            level = SensitivityLevel.LOW
        else:
            level = SensitivityLevel.MEDIUM  # Default

        # Add to metadata
        entity.metadata['sensitivity_level'] = level.value

    logger.debug("sensitivity_scored", entity_count=len(entities))
    return entities


# ============================================================================
# Filter Chain
# ============================================================================

class FilterChain:
    """
    Chain of responsibility for applying multiple filters

    Usage:
        chain = FilterChain()
        chain.add_filter(normalize_text)
        chain.add_filter(validate_entities)
        chain.add_filter(legal_pattern_matcher)

        processed_text, filtered_entities = await chain.apply(text, entities)
    """

    def __init__(self):
        self.text_filters: List[Callable[[str], str]] = []
        self.entity_filters: List[Callable[[List[DetectedEntity]], List[DetectedEntity]]] = []
        self.context_filters: List[Callable[[str, List[DetectedEntity]], List[DetectedEntity]]] = []

    def add_text_filter(self, filter_func: Callable[[str], str]):
        """Add a text preprocessing filter"""
        self.text_filters.append(filter_func)

    def add_entity_filter(self, filter_func: Callable[[List[DetectedEntity]], List[DetectedEntity]]):
        """Add an entity filtering function"""
        self.entity_filters.append(filter_func)

    def add_context_filter(
        self,
        filter_func: Callable[[str, List[DetectedEntity]], List[DetectedEntity]]
    ):
        """Add a context-aware entity filter"""
        self.context_filters.append(filter_func)

    async def apply_text_filters(self, text: str) -> str:
        """Apply all text filters in sequence"""
        for filter_func in self.text_filters:
            text = filter_func(text)
        return text

    async def apply_entity_filters(
        self,
        entities: List[DetectedEntity],
        text: Optional[str] = None,
    ) -> List[DetectedEntity]:
        """Apply all entity filters in sequence"""
        # First apply simple entity filters
        for filter_func in self.entity_filters:
            entities = filter_func(entities)

        # Then apply context-aware filters (require text)
        if text:
            for filter_func in self.context_filters:
                entities = filter_func(text, entities)

        return entities

    async def apply(
        self,
        text: str,
        entities: Optional[List[DetectedEntity]] = None,
    ) -> tuple[str, Optional[List[DetectedEntity]]]:
        """
        Apply all filters (text + entity)

        Args:
            text: Input text
            entities: Detected entities (optional)

        Returns:
            Tuple of (filtered_text, filtered_entities)
        """
        # Apply text filters
        filtered_text = await self.apply_text_filters(text)

        # Apply entity filters if entities provided
        filtered_entities = None
        if entities is not None:
            filtered_entities = await self.apply_entity_filters(entities, filtered_text)

        return filtered_text, filtered_entities
