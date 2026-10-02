from typing import Any

from flask import jsonify


def ok(payload: Any, status: int = 200):
    return jsonify(payload), status


def error(message: str, status: int = 400):
    return jsonify({"error": message}), status