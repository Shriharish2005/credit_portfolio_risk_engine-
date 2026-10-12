"""
Structured logging configuration.
"""

import logging
import sys


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("credit_risk_engine")
    if not logger.handlers:
        logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


logger = setup_logging()
