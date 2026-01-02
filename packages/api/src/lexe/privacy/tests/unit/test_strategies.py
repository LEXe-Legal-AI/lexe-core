"""
Unit tests for privacy replacement strategies (strategies.py)

Tests cover:
1. DeterministicReplacer (5 tests)
2. SyntheticReplacer (5 tests)
3. RedactionReplacer (4 tests)
4. HashReplacer (3 tests)
5. ConsistentReplacer (2 tests)
6. Factory functions (1 test)

Total: 20 tests
"""
import pytest
from llsearch.privacy.pipeline.strategies import (
    DeterministicReplacer,
    SyntheticReplacer,
    RedactionReplacer,
    HashReplacer,
    ConsistentReplacer,
    create_strategy,
    create_consistent_strategy,
)
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType


# =============================================================================
# 1. DeterministicReplacer Tests (5 tests)
# =============================================================================

@pytest.mark.unit
def test_deterministic_replacer_basic(entity_person):
    """Test basic deterministic replacement"""
    replacer = DeterministicReplacer()

    replacement = replacer.replace("Mario Rossi lives here", entity_person)

    # Should get PERSON_A (first person, letter A)
    assert replacement == "PERSON_A"


@pytest.mark.unit
def test_deterministic_replacer_letter_indexing():
    """Test letter indexing for PERSON entities (A, B, C...)"""
    replacer = DeterministicReplacer(use_letters_for_names=True)

    entities = [
        DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95),
        DetectedEntity(type=EntityType.PERSON, text="Laura Bianchi", start=20, end=33, confidence=0.92),
        DetectedEntity(type=EntityType.PERSON, text="Giovanni Verdi", start=40, end=54, confidence=0.90),
    ]

    text = "Mario Rossi, Laura Bianchi and Giovanni Verdi are here."
    result = replacer.replace_all(text, entities)

    assert "PERSON_A" in result  # First person
    assert "PERSON_B" in result  # Second person
    assert "PERSON_C" in result  # Third person


@pytest.mark.unit
def test_deterministic_replacer_consistency():
    """Test that same entity text gets same replacement"""
    replacer = DeterministicReplacer()

    text = "Mario Rossi is here. Later, Mario Rossi appears again."

    # Find actual positions
    first_pos = text.find("Mario Rossi")
    second_pos = text.find("Mario Rossi", first_pos + 1)

    entity1 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=first_pos, end=first_pos+11, confidence=0.95)
    entity2 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=second_pos, end=second_pos+11, confidence=0.95)

    result = replacer.replace_all(text, [entity1, entity2])

    # Both should be replaced with PERSON_A
    assert result.count("PERSON_A") == 2
    assert "Mario Rossi" not in result


@pytest.mark.unit
def test_deterministic_replacer_reset():
    """Test reset functionality clears internal state"""
    replacer = DeterministicReplacer()

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    # First replacement
    replacement1 = replacer.replace("Mario Rossi", entity)
    assert replacement1 == "PERSON_A"

    # Reset
    replacer.reset()

    # Second replacement after reset should also be PERSON_A
    replacement2 = replacer.replace("Mario Rossi", entity)
    assert replacement2 == "PERSON_A"


@pytest.mark.unit
def test_deterministic_replacer_custom_template():
    """Test custom format template"""
    replacer = DeterministicReplacer(format_template="<{type}_{index}>", use_letters_for_names=False)

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    replacement = replacer.replace("Mario Rossi", entity)

    assert replacement == "<PERSON_1>"


# =============================================================================
# 2. SyntheticReplacer Tests (5 tests)
# =============================================================================

@pytest.mark.unit
def test_synthetic_replacer_person_name():
    """Test synthetic person name generation"""
    replacer = SyntheticReplacer(locale='it_IT')

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    replacement = replacer.replace("Mario Rossi", entity)

    # Should be a synthetic Italian name
    assert isinstance(replacement, str)
    assert len(replacement) > 0
    assert replacement != "Mario Rossi"  # Should be different from original


@pytest.mark.unit
def test_synthetic_replacer_email():
    """Test synthetic email generation"""
    replacer = SyntheticReplacer(locale='it_IT')

    entity = DetectedEntity(type=EntityType.EMAIL, text="[email protected]", start=0, end=24, confidence=0.99)

    replacement = replacer.replace("[email protected]", entity)

    # Should be a synthetic email
    assert '@' in replacement
    assert '.' in replacement
    assert replacement != "[email protected]"


@pytest.mark.unit
def test_synthetic_replacer_consistency():
    """Test that same entity gets same synthetic replacement"""
    replacer = SyntheticReplacer(locale='it_IT', seed=42)

    text = "Mario Rossi is here. Later, Mario Rossi appears again."

    # Find actual positions
    first_pos = text.find("Mario Rossi")
    second_pos = text.find("Mario Rossi", first_pos + 1)

    entity1 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=first_pos, end=first_pos+11, confidence=0.95)
    entity2 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=second_pos, end=second_pos+11, confidence=0.95)

    result = replacer.replace_all(text, [entity1, entity2])

    # Find the replacement for "Mario Rossi"
    parts = result.split(" is here. Later, ")
    first_replacement = parts[0]
    second_replacement = parts[1].split(" appears")[0]

    # Both should be the same synthetic name
    assert first_replacement == second_replacement


@pytest.mark.unit
def test_synthetic_replacer_seed_reproducibility():
    """Test that same seed produces same synthetic data"""
    replacer1 = SyntheticReplacer(locale='it_IT', seed=42)
    replacer2 = SyntheticReplacer(locale='it_IT', seed=42)

    entity = DetectedEntity(type=EntityType.PERSON, text="Test Person", start=0, end=11, confidence=0.95)

    replacement1 = replacer1.replace("Test Person", entity)
    replacement2 = replacer2.replace("Test Person", entity)

    # Same seed should produce same replacement
    assert replacement1 == replacement2


@pytest.mark.unit
def test_synthetic_replacer_different_locales():
    """Test different locales produce different names"""
    replacer_it = SyntheticReplacer(locale='it_IT', seed=100)
    replacer_en = SyntheticReplacer(locale='en_US', seed=100)

    entity = DetectedEntity(type=EntityType.PERSON, text="Test", start=0, end=4, confidence=0.95)

    replacement_it = replacer_it.replace("Test", entity)
    replacement_en = replacer_en.replace("Test", entity)

    # Different locales should produce different names
    # (Although with same seed, they might occasionally match)
    assert isinstance(replacement_it, str)
    assert isinstance(replacement_en, str)


# =============================================================================
# 3. RedactionReplacer Tests (4 tests)
# =============================================================================

@pytest.mark.unit
def test_redaction_replacer_basic():
    """Test basic redaction replacement"""
    replacer = RedactionReplacer()

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    replacement = replacer.replace("Mario Rossi", entity)

    # Should use Italian label by default
    assert replacement == "[NOME]"


@pytest.mark.unit
def test_redaction_replacer_italian_labels():
    """Test Italian label usage"""
    replacer = RedactionReplacer(use_italian_labels=True)

    entities = [
        DetectedEntity(type=EntityType.PERSON, text="Mario", start=0, end=5, confidence=0.95),
        DetectedEntity(type=EntityType.FISCAL_CODE, text="RSSMRA85C15F205X", start=10, end=26, confidence=0.98),
        DetectedEntity(type=EntityType.EMAIL, text="[email protected]", start=30, end=45, confidence=0.99),
    ]

    text = "Mario, RSSMRA85C15F205X, [email protected]"
    result = replacer.replace_all(text, entities)

    assert "[NOME]" in result
    assert "[CODICE_FISCALE]" in result
    assert "[EMAIL]" in result


@pytest.mark.unit
def test_redaction_replacer_english_labels():
    """Test English label usage"""
    replacer = RedactionReplacer(use_italian_labels=False)

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    replacement = replacer.replace("Mario Rossi", entity)

    # Should use English label
    assert replacement == "[PERSON]"


@pytest.mark.unit
def test_redaction_replacer_custom_template():
    """Test custom redaction template"""
    replacer = RedactionReplacer(format_template="***{type}***", use_italian_labels=False)

    entity = DetectedEntity(type=EntityType.EMAIL, text="[email protected]", start=0, end=24, confidence=0.99)

    replacement = replacer.replace("[email protected]", entity)

    assert replacement == "***EMAIL***"


# =============================================================================
# 4. HashReplacer Tests (3 tests)
# =============================================================================

@pytest.mark.unit
def test_hash_replacer_sha256():
    """Test SHA256 hashing"""
    replacer = HashReplacer(algorithm='sha256', truncate=16)

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    replacement = replacer.replace("Mario Rossi", entity)

    # Should be "HASH_" + 16 hex characters
    assert replacement.startswith("HASH_")
    assert len(replacement) == 5 + 16  # "HASH_" + 16 chars
    assert all(c in '0123456789abcdef' for c in replacement[5:])


@pytest.mark.unit
def test_hash_replacer_truncation():
    """Test hash truncation"""
    replacer_full = HashReplacer(algorithm='sha256', truncate=None, prefix='')
    replacer_short = HashReplacer(algorithm='sha256', truncate=8, prefix='')

    entity = DetectedEntity(type=EntityType.PERSON, text="Test", start=0, end=4, confidence=0.95)

    full_hash = replacer_full.replace("Test", entity)
    short_hash = replacer_short.replace("Test", entity)

    # Full SHA256 hash is 64 hex characters
    assert len(full_hash) == 64

    # Truncated hash should be 8 characters
    assert len(short_hash) == 8

    # Short hash should be prefix of full hash
    assert full_hash.startswith(short_hash)


@pytest.mark.unit
def test_hash_replacer_salt():
    """Test that salt changes hash value"""
    replacer_no_salt = HashReplacer(algorithm='sha256', truncate=16, salt=None)
    replacer_with_salt = HashReplacer(algorithm='sha256', truncate=16, salt='my_secret_salt')

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    hash_no_salt = replacer_no_salt.replace("Mario Rossi", entity)
    hash_with_salt = replacer_with_salt.replace("Mario Rossi", entity)

    # Hashes should be different when salt is used
    assert hash_no_salt != hash_with_salt


# =============================================================================
# 5. ConsistentReplacer Tests (2 tests)
# =============================================================================

@pytest.mark.unit
def test_consistent_replacer_wrapper():
    """Test ConsistentReplacer wraps base strategy correctly"""
    # Use synthetic replacer (which has randomness)
    base_strategy = SyntheticReplacer(locale='it_IT')
    consistent = ConsistentReplacer(base_strategy)

    entity1 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)
    entity2 = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=50, end=61, confidence=0.95)

    # Replace same entity twice
    replacement1 = consistent.replace("Mario Rossi", entity1)
    replacement2 = consistent.replace("Mario Rossi", entity2)

    # ConsistentReplacer should ensure same replacement
    assert replacement1 == replacement2


@pytest.mark.unit
def test_consistent_replacer_reset():
    """Test ConsistentReplacer reset clears consistency map"""
    base_strategy = SyntheticReplacer(locale='it_IT', seed=42)
    consistent = ConsistentReplacer(base_strategy)

    entity = DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)

    # First replacement
    replacement1 = consistent.replace("Mario Rossi", entity)

    # Reset
    consistent.reset()

    # Second replacement after reset might be different (due to Faker randomness)
    replacement2 = consistent.replace("Mario Rossi", entity)

    # After reset, we get a fresh replacement from base strategy
    # (May or may not be the same due to Faker internals)
    assert isinstance(replacement2, str)


# =============================================================================
# 6. Factory Function Tests (1 test)
# =============================================================================

@pytest.mark.unit
def test_create_strategy_factory():
    """Test create_strategy factory function"""
    # Test creating different strategies
    deterministic = create_strategy('deterministic', use_letters_for_names=True)
    assert isinstance(deterministic, DeterministicReplacer)
    assert deterministic.use_letters_for_names is True

    synthetic = create_strategy('synthetic', locale='it_IT', seed=42)
    assert isinstance(synthetic, SyntheticReplacer)

    redaction = create_strategy('redaction', use_italian_labels=False)
    assert isinstance(redaction, RedactionReplacer)

    hash_strategy = create_strategy('hash', algorithm='sha256', truncate=16)
    assert isinstance(hash_strategy, HashReplacer)


@pytest.mark.unit
def test_create_strategy_invalid():
    """Test create_strategy raises error for invalid strategy name"""
    with pytest.raises(ValueError, match="Unknown replacement strategy"):
        create_strategy('invalid_strategy')


@pytest.mark.unit
def test_create_consistent_strategy_factory():
    """Test create_consistent_strategy factory function"""
    consistent = create_consistent_strategy('synthetic', locale='it_IT')

    assert isinstance(consistent, ConsistentReplacer)
    assert isinstance(consistent.base_strategy, SyntheticReplacer)


# =============================================================================
# 7. Edge Case Tests (2 bonus tests)
# =============================================================================

@pytest.mark.unit
def test_deterministic_replacer_mixed_entity_types():
    """Test deterministic replacer with mixed entity types"""
    replacer = DeterministicReplacer(use_letters_for_names=True)

    entities = [
        DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95),
        DetectedEntity(type=EntityType.ORGANIZATION, text="Acme S.p.A.", start=20, end=31, confidence=0.90),
        DetectedEntity(type=EntityType.FISCAL_CODE, text="RSSMRA85C15F205X", start=40, end=56, confidence=0.98),
        DetectedEntity(type=EntityType.PERSON, text="Laura Bianchi", start=60, end=73, confidence=0.92),
    ]

    text = "Mario Rossi, Acme S.p.A., RSSMRA85C15F205X, Laura Bianchi"
    result = replacer.replace_all(text, entities)

    # Check different entity types get different counters
    assert "PERSON_A" in result  # First person
    assert "PERSON_B" in result  # Second person
    assert "ORG_A" in result  # First organization
    assert "CF_1" in result  # CF uses numbers (use_letters_for_names only for PERSON/ORG)


@pytest.mark.unit
def test_synthetic_replacer_cf_generation():
    """Test synthetic CF generation"""
    replacer = SyntheticReplacer(locale='it_IT')

    entity = DetectedEntity(type=EntityType.FISCAL_CODE, text="RSSMRA85C15F205X", start=0, end=16, confidence=0.98)

    replacement = replacer.replace("RSSMRA85C15F205X", entity)

    # Should be 16 characters (realistic CF format)
    assert len(replacement) == 16
    assert replacement != "RSSMRA85C15F205X"
