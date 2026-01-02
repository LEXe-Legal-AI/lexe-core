"""
Dataset loader for benchmarking.

Provides functions to load test datasets with ground truth annotations.
"""

import json
from pathlib import Path
from typing import List, Dict


def load_sample_dataset() -> List[Dict]:
    """
    Load a small sample dataset for quick testing.

    Returns:
        List of 10 annotated documents with:
        - text: Document text
        - entities: Ground truth entities (type, start, end)
        - document_id: Unique identifier
        - document_type: Type (sentenza, contratto, etc.)
    """
    return [
        {
            'document_id': 'sample_001',
            'document_type': 'sentenza',
            'text': (
                'Il giudice Mario Rossi (CF: RSSMRA85T10A562S) ha emesso sentenza '
                'in data 15 gennaio 2024 presso il Tribunale di Milano. '
                'L\'imputato, Giovanni Bianchi (CF: BNCGNN90H12F205Z), '
                'è stato condannato a 2 anni di reclusione.'
            ),
            'entities': [
                {'type': 'PERSON', 'start': 10, 'end': 21},  # Mario Rossi
                {'type': 'CF', 'start': 27, 'end': 43},  # RSSMRA85T10A562S
                {'type': 'DATE', 'start': 69, 'end': 86},  # 15 gennaio 2024
                {'type': 'ORG', 'start': 94, 'end': 115},  # Tribunale di Milano
                {'type': 'PERSON', 'start': 129, 'end': 144},  # Giovanni Bianchi
                {'type': 'CF', 'start': 150, 'end': 166},  # BNCGNN90H12F205Z
            ]
        },
        {
            'document_id': 'sample_002',
            'document_type': 'contratto',
            'text': (
                'La società Tech Solutions S.r.l. (P.IVA: 12345678901) con sede a Roma, '
                'Via Nazionale 100, rappresentata dal legale rappresentante '
                'Laura Verdi (CF: VRDLRA88C50H501X) stipula il presente contratto.'
            ),
            'entities': [
                {'type': 'ORG', 'start': 12, 'end': 33},  # Tech Solutions S.r.l.
                {'type': 'PIVA', 'start': 42, 'end': 53},  # 12345678901
                {'type': 'LOCATION', 'start': 67, 'end': 71},  # Roma
                {'type': 'LOCATION', 'start': 73, 'end': 91},  # Via Nazionale 100
                {'type': 'PERSON', 'start': 136, 'end': 147},  # Laura Verdi
                {'type': 'CF', 'start': 153, 'end': 169},  # VRDLRA88C50H501X
            ]
        },
        {
            'document_id': 'sample_003',
            'document_type': 'sentenza',
            'text': (
                'La Corte di Cassazione, sezione penale, ha accolto il ricorso '
                'presentato dall\'avvocato Paolo Neri (CF: NREPLA75D15L736Y) '
                'per conto del cliente Marco Gialli.'
            ),
            'entities': [
                {'type': 'ORG', 'start': 3, 'end': 24},  # Corte di Cassazione
                {'type': 'PERSON', 'start': 91, 'end': 101},  # Paolo Neri
                {'type': 'CF', 'start': 107, 'end': 123},  # NREPLA75D15L736Y
                {'type': 'PERSON', 'start': 144, 'end': 156},  # Marco Gialli
            ]
        },
        {
            'document_id': 'sample_004',
            'document_type': 'atto_notarile',
            'text': (
                'Il notaio Anna Blu (CF: BLUNNA82A41F839W), iscritto al Collegio '
                'Notarile di Firenze con numero 1234, redige il presente atto.'
            ),
            'entities': [
                {'type': 'PERSON', 'start': 10, 'end': 19},  # Anna Blu
                {'type': 'CF', 'start': 25, 'end': 41},  # BLUNNA82A41F839W
                {'type': 'ORG', 'start': 57, 'end': 82},  # Collegio Notarile di Firenze
            ]
        },
        {
            'document_id': 'sample_005',
            'document_type': 'sentenza',
            'text': (
                'Il Ministero della Giustizia ha autorizzato la perizia '
                'richiesta dal perito tecnico Stefano Grigi (CF: GRGSFN79M20D612V) '
                'per il procedimento n. 12345/2024.'
            ),
            'entities': [
                {'type': 'ORG', 'start': 3, 'end': 31},  # Ministero della Giustizia
                {'type': 'PERSON', 'start': 92, 'end': 105},  # Stefano Grigi
                {'type': 'CF', 'start': 111, 'end': 127},  # GRGSFN79M20D612V
            ]
        },
        {
            'document_id': 'sample_006',
            'document_type': 'contratto',
            'text': (
                'Acme Corp S.p.A. (P.IVA: 98765432109) e Beta Solutions S.r.l. '
                '(P.IVA: 11223344556) sottoscrivono il contratto di fornitura.'
            ),
            'entities': [
                {'type': 'ORG', 'start': 0, 'end': 16},  # Acme Corp S.p.A.
                {'type': 'PIVA', 'start': 25, 'end': 36},  # 98765432109
                {'type': 'ORG', 'start': 40, 'end': 61},  # Beta Solutions S.r.l.
                {'type': 'PIVA', 'start': 70, 'end': 81},  # 11223344556
            ]
        },
        {
            'document_id': 'sample_007',
            'document_type': 'sentenza',
            'text': (
                'Il Tribunale Amministrativo Regionale per il Lazio ha respinto '
                'il ricorso presentato da Giulia Rosa (CF: RSOGLI91L47H501B).'
            ),
            'entities': [
                {'type': 'ORG', 'start': 3, 'end': 54},  # Tribunale Amministrativo Regionale per il Lazio
                {'type': 'PERSON', 'start': 95, 'end': 106},  # Giulia Rosa
                {'type': 'CF', 'start': 112, 'end': 128},  # RSOGLI91L47H501B
            ]
        },
        {
            'document_id': 'sample_008',
            'document_type': 'contratto',
            'text': (
                'La ditta individuale di Francesca Viola (CF: VLOFNC85R50D969Q) '
                'stipula contratto con XYZ Services S.r.l. (P.IVA: 55667788990).'
            ),
            'entities': [
                {'type': 'PERSON', 'start': 24, 'end': 39},  # Francesca Viola
                {'type': 'CF', 'start': 45, 'end': 61},  # VLOFNC85R50D969Q
                {'type': 'ORG', 'start': 83, 'end': 103},  # XYZ Services S.r.l.
                {'type': 'PIVA', 'start': 112, 'end': 123},  # 55667788990
            ]
        },
        {
            'document_id': 'sample_009',
            'document_type': 'sentenza',
            'text': (
                'La Corte d\'Appello di Napoli, nella persona del presidente '
                'Roberto Marrone (CF: MRRRRT70P10F839M), ha confermato la sentenza.'
            ),
            'entities': [
                {'type': 'ORG', 'start': 3, 'end': 29},  # Corte d'Appello di Napoli
                {'type': 'PERSON', 'start': 64, 'end': 79},  # Roberto Marrone
                {'type': 'CF', 'start': 85, 'end': 101},  # MRRRRT70P10F839M
            ]
        },
        {
            'document_id': 'sample_010',
            'document_type': 'atto_notarile',
            'text': (
                'Il notaio Luca Azzurri (CF: AZZLCU68T25L219Z) certifica '
                'l\'autenticità della firma di Silvia Arancio (CF: RNCSVI92D55F205P) '
                'sul documento di compravendita.'
            ),
            'entities': [
                {'type': 'PERSON', 'start': 10, 'end': 23},  # Luca Azzurri
                {'type': 'CF', 'start': 29, 'end': 45},  # AZZLCU68T25L219Z
                {'type': 'PERSON', 'start': 89, 'end': 103},  # Silvia Arancio
                {'type': 'CF', 'start': 109, 'end': 125},  # RNCSVI92D55F205P
            ]
        },
    ]


def load_legal_corpus(corpus_file: str = None) -> List[Dict]:
    """
    Load full legal corpus dataset.

    If corpus_file is provided and exists, loads from file.
    Otherwise, returns sample dataset.

    Args:
        corpus_file: Optional path to JSON corpus file

    Returns:
        List of annotated documents
    """
    if corpus_file and Path(corpus_file).exists():
        with open(corpus_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    # Fallback to sample dataset
    return load_sample_dataset()
