"""
Privacy API Module

Provides REST API endpoints for privacy/pseudonymization service.
"""

from .privacy_controller import privacy_bp

__all__ = ['privacy_bp']
