"""PepsLive Tournament Studio local server.

Serves the existing static app and adds dependency-free local relays for the
mobile spin remote and OBS state snapshots. The state endpoint only accepts
updates from the local Control page and strips webhook secrets before serving
the snapshot to OBS Browser Sources on the LAN.
"""

from __future__ import annotations

import argparse
import hmac
import json
import secrets
import socket
import threading
import time
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit


ROOT = Path(__file__).resolve().parent
APP_NAME = "PepsLive Tournament Studio"
MAX_STATE_BYTES = 4 * 1024 * 1024
PUBLIC_STATE_KEYS = {
    "version", "updatedAt", "event", "teams", "groups", "manualGroups",
    "pendingGroups", "pendingSequence", "pendingRevealIndex", "pendingComplete",
    "drawLive", "matches", "manualSchedule", "pendingSchedule", "scheduleLive",
    "standings", "qualifierOverrides", "knockout", "lastResult", "settings",
}


# QR Code byte-mode encoder for versions 1-5, error correction level L.
# The remote link is short enough for these versions and this keeps run.bat
# fully offline without a Python package or a third-party QR service.
QR_DATA_CODEWORDS = {1: 19, 2: 34, 3: 55, 4: 80, 5: 108}
QR_ECC_CODEWORDS = {1: 7, 2: 10, 3: 15, 4: 20, 5: 26}
QR_ALIGNMENT = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30]}

_GF_EXP = [0] * 512
_GF_LOG = [0] * 256
_value = 1
for _index in range(255):
    _GF_EXP[_index] = _value
    _GF_LOG[_value] = _index
    _value <<= 1
    if _value & 0x100:
        _value ^= 0x11D
for _index in range(255, 512):
    _GF_EXP[_index] = _GF_EXP[_index - 255]


def _gf_mul(left: int, right: int) -> int:
    if left == 0 or right == 0:
        return 0
    return _GF_EXP[_GF_LOG[left] + _GF_LOG[right]]


def _append_bits(bits: list[int], value: int, count: int) -> None:
    for shift in range(count - 1, -1, -1):
        bits.append((value >> shift) & 1)


def _rs_generator(degree: int) -> list[int]:
    generator = [1]
    for index in range(degree):
        result = [0] * (len(generator) + 1)
        for position, coefficient in enumerate(generator):
            result[position] ^= coefficient
            result[position + 1] ^= _gf_mul(coefficient, _GF_EXP[index])
        generator = result
    return generator


def _reed_solomon(data: list[int], degree: int) -> list[int]:
    generator = _rs_generator(degree)
    remainder = [0] * degree
    for byte in data:
        factor = byte ^ remainder[0]
        remainder = remainder[1:] + [0]
        for index in range(degree):
            remainder[index] ^= _gf_mul(generator[index + 1], factor)
    return remainder


def _qr_codewords(text: str, version: int) -> list[int]:
    payload = text.encode("utf-8")
    data_capacity = QR_DATA_CODEWORDS[version] * 8
    if len(payload) > QR_DATA_CODEWORDS[version] - 2:
        raise ValueError("QR payload is too long")

    bits: list[int] = []
    _append_bits(bits, 0b0100, 4)  # byte mode
    _append_bits(bits, len(payload), 8)
    for byte in payload:
        _append_bits(bits, byte, 8)

    bits.extend([0] * min(4, data_capacity - len(bits)))
    while len(bits) % 8:
        bits.append(0)
    data = []
    for offset in range(0, len(bits), 8):
        value = 0
        for bit in bits[offset:offset + 8]:
            value = (value << 1) | bit
        data.append(value)

    pad = 0xEC
    while len(data) < QR_DATA_CODEWORDS[version]:
        data.append(pad)
        pad = 0x11 if pad == 0xEC else 0xEC
    return data + _reed_solomon(data, QR_ECC_CODEWORDS[version])


def _bch_remainder(value: int, polynomial: int) -> int:
    value <<= polynomial.bit_length() - 1
    while value.bit_length() >= polynomial.bit_length():
        value ^= polynomial << (value.bit_length() - polynomial.bit_length())
    return value


def _mask_bit(mask: int, row: int, column: int) -> bool:
    if mask == 0:
        return (row + column) % 2 == 0
    if mask == 1:
        return row % 2 == 0
    if mask == 2:
        return column % 3 == 0
    if mask == 3:
        return (row + column) % 3 == 0
    if mask == 4:
        return (row // 2 + column // 3) % 2 == 0
    if mask == 5:
        product = row * column
        return product % 2 + product % 3 == 0
    if mask == 6:
        product = row * column
        return (product % 2 + product % 3) % 2 == 0
    product = row * column
    return ((product % 3 + (row + column) % 2) % 2) == 0


def _finder(matrix: list[list[bool | None]], top: int, left: int) -> None:
    size = len(matrix)
    for row in range(-1, 8):
        for column in range(-1, 8):
            target_row = top + row
            target_column = left + column
            if not (0 <= target_row < size and 0 <= target_column < size):
                continue
            black = (
                0 <= row <= 6
                and 0 <= column <= 6
                and (row in (0, 6) or column in (0, 6) or (2 <= row <= 4 and 2 <= column <= 4))
            )
            matrix[target_row][target_column] = black


def _alignment(matrix: list[list[bool | None]], center_row: int, center_column: int) -> None:
    if matrix[center_row][center_column] is not None:
        return
    for row in range(-2, 3):
        for column in range(-2, 3):
            matrix[center_row + row][center_column + column] = (
                max(abs(row), abs(column)) in (0, 2)
            )


def _format_bits(mask: int) -> int:
    # Error correction level L is 01 in QR format information.
    value = (0b01 << 3) | mask
    return (value << 10 | _bch_remainder(value, 0x537)) ^ 0x5412


def _place_format(matrix: list[list[bool | None]], mask: int) -> None:
    size = len(matrix)
    value = _format_bits(mask)
    for index in range(15):
        bit = ((value >> index) & 1) != 0
        vertical = index if index < 6 else index + 1 if index < 8 else size - 15 + index
        horizontal = size - index - 1 if index < 8 else 15 - index if index < 9 else 15 - index - 1
        matrix[vertical][8] = bit
        matrix[8][horizontal] = bit
    matrix[size - 8][8] = True


def _place_data(matrix: list[list[bool | None]], codewords: list[int], mask: int) -> None:
    bits: list[int] = []
    for byte in codewords:
        _append_bits(bits, byte, 8)

    size = len(matrix)
    bit_index = 0
    column = size - 1
    upward = True
    while column > 0:
        if column == 6:
            column -= 1
        rows = range(size - 1, -1, -1) if upward else range(size)
        for row in rows:
            for current_column in (column, column - 1):
                if matrix[row][current_column] is not None:
                    continue
                bit = bits[bit_index] if bit_index < len(bits) else 0
                bit_index += 1
                matrix[row][current_column] = bool(bit ^ _mask_bit(mask, row, current_column))
        upward = not upward
        column -= 2


def _penalty(matrix: list[list[bool]]) -> int:
    size = len(matrix)
    score = 0

    def add_runs(values: list[bool]) -> int:
        result = 0
        run_color = values[0]
        run_length = 1
        for value in values[1:]:
            if value == run_color:
                run_length += 1
            else:
                if run_length >= 5:
                    result += 3 + run_length - 5
                run_color = value
                run_length = 1
        if run_length >= 5:
            result += 3 + run_length - 5
        return result

    for row in matrix:
        score += add_runs(row)
    for column in range(size):
        score += add_runs([matrix[row][column] for row in range(size)])

    for row in range(size - 1):
        for column in range(size - 1):
            block = matrix[row][column]
            if matrix[row + 1][column] == block and matrix[row][column + 1] == block and matrix[row + 1][column + 1] == block:
                score += 3

    pattern = [True, False, True, True, True, False, True]
    for row in matrix:
        for start in range(size - 6):
            if row[start:start + 7] == pattern:
                score += 40
    for column in range(size):
        values = [matrix[row][column] for row in range(size)]
        for start in range(size - 6):
            if values[start:start + 7] == pattern:
                score += 40

    dark = sum(sum(row) for row in matrix)
    score += abs(dark * 100 // (size * size) - 50) // 5 * 10
    return score


def _make_qr_matrix(text: str) -> list[list[bool]]:
    payload = text.encode("utf-8")
    version = next((v for v in QR_DATA_CODEWORDS if len(payload) <= QR_DATA_CODEWORDS[v] - 2), None)
    if version is None:
        raise ValueError("Remote URL is too long for the built-in QR encoder")
    codewords = _qr_codewords(text, version)
    size = 17 + version * 4
    best: tuple[int, list[list[bool]]] | None = None

    for mask in range(8):
        matrix: list[list[bool | None]] = [[None] * size for _ in range(size)]
        _finder(matrix, 0, 0)
        _finder(matrix, 0, size - 7)
        _finder(matrix, size - 7, 0)

        for index in range(8, size - 8):
            if matrix[6][index] is None:
                matrix[6][index] = index % 2 == 0
            if matrix[index][6] is None:
                matrix[index][6] = index % 2 == 0

        centers = QR_ALIGNMENT[version]
        for row in centers:
            for column in centers:
                _alignment(matrix, row, column)

        _place_format(matrix, mask)
        _place_data(matrix, codewords, mask)
        completed = [[bool(cell) for cell in row] for row in matrix]
        score = _penalty(completed)
        if best is None or score < best[0]:
            best = (score, completed)

    if best is None:
        raise RuntimeError("Could not create QR matrix")
    return best[1]


def qr_svg(text: str) -> bytes:
    matrix = _make_qr_matrix(text)
    size = len(matrix)
    quiet = 4
    total = size + quiet * 2
    paths = []
    for row, values in enumerate(matrix):
        for column, dark in enumerate(values):
            if dark:
                paths.append(f"M{column + quiet} {row + quiet}h1v1h-1z")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" '
        f'role="img" aria-label="PepsLive mobile remote QR code" shape-rendering="crispEdges">'
        f'<rect width="{total}" height="{total}" fill="#fff"/>'
        f'<path fill="#000" d="{"".join(paths)}"/></svg>'
    )
    return svg.encode("utf-8")


def local_ipv4() -> str:
    candidates: list[str] = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("192.0.2.1", 80))
            candidates.append(sock.getsockname()[0])
    except OSError:
        pass
    try:
        _, _, addresses = socket.gethostbyname_ex(socket.gethostname())
        candidates.extend(addresses)
    except OSError:
        pass
    for address in candidates:
        if address and not address.startswith("127.") and not address.startswith("169.254."):
            return address
    return "127.0.0.1"


class RelayState:
    def __init__(self, port: int):
        self.port = port
        self.lan_ip = local_ipv4()
        self.token = secrets.token_urlsafe(18)
        self.token_version = 1
        self.events: deque[dict] = deque(maxlen=100)
        self.next_event_id = 1
        self.last_spin_at = 0.0
        self.state_snapshot: dict | None = None
        self.state_revision = 0
        self.state_updated_at = ""
        self.state_fingerprint = ""
        self.lock = threading.Lock()
        self.events_condition = threading.Condition(self.lock)

    def remote_url(self) -> str:
        return f"http://{self.lan_ip}:{self.port}/remote.html?token={quote(self.token)}"

    def info(self) -> dict:
        return {
            "ok": True,
            "server": APP_NAME,
            "lanIp": self.lan_ip,
            "port": self.port,
            "remoteUrl": self.remote_url(),
            "qrUrl": f"/api/remote/qr.svg?token={quote(self.token)}",
            "tokenVersion": self.token_version,
        }

    def valid(self, token: str | None) -> bool:
        return bool(token) and hmac.compare_digest(str(token), self.token)

    def rotate(self) -> None:
        with self.events_condition:
            self.token = secrets.token_urlsafe(18)
            self.token_version += 1
            self.events.clear()
            self.last_spin_at = 0.0
            self.events_condition.notify_all()

    def spin(self) -> tuple[bool, dict]:
        now = time.monotonic()
        with self.events_condition:
            remaining = 1.0 - (now - self.last_spin_at)
            if remaining > 0:
                return False, {"ok": False, "error": "cooldown", "retryAfter": round(remaining, 2)}
            self.last_spin_at = now
            event = {"id": self.next_event_id, "type": "spin", "at": time.time()}
            self.next_event_id += 1
            self.events.append(event)
            self.events_condition.notify_all()
            return True, {"ok": True, "event": event}

    def events_after(self, since: int) -> dict:
        with self.lock:
            events = [event for event in self.events if int(event["id"]) > since]
            latest = self.next_event_id - 1
        return {"ok": True, "events": events, "latest": latest}

    def wait_events_after(self, since: int, timeout: float = 20.0) -> dict:
        with self.events_condition:
            self.events_condition.wait_for(
                lambda: any(int(event["id"]) > since for event in self.events),
                timeout=timeout,
            )
            events = [event for event in self.events if int(event["id"]) > since]
            latest = self.next_event_id - 1
        return {"ok": True, "events": events, "latest": latest}

    def publish_state(self, incoming: dict) -> dict:
        public_state = {
            key: incoming[key]
            for key in PUBLIC_STATE_KEYS
            if key in incoming
        }
        fingerprint = json.dumps(public_state, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        with self.events_condition:
            if self.state_snapshot is not None and fingerprint == self.state_fingerprint:
                return {
                    "ok": True,
                    "ready": True,
                    "revision": self.state_revision,
                    "updatedAt": self.state_updated_at,
                }
            self.state_snapshot = public_state
            self.state_revision += 1
            self.state_updated_at = str(incoming.get("updatedAt") or "")
            self.state_fingerprint = fingerprint
            self.events_condition.notify_all()
            return {
                "ok": True,
                "ready": True,
                "revision": self.state_revision,
                "updatedAt": self.state_updated_at,
            }

    def state_info(self) -> dict:
        with self.lock:
            return {
                "ok": True,
                "ready": self.state_snapshot is not None,
                "revision": self.state_revision,
                "updatedAt": self.state_updated_at,
                "state": self.state_snapshot,
            }

    def wait_state_after(self, revision: int, timeout: float = 20.0) -> dict:
        with self.events_condition:
            self.events_condition.wait_for(
                lambda: self.state_revision != revision,
                timeout=timeout,
            )
            return {
                "ok": True,
                "ready": self.state_snapshot is not None,
                "revision": self.state_revision,
                "updatedAt": self.state_updated_at,
                "state": self.state_snapshot,
            }


class RelayHandler(SimpleHTTPRequestHandler):
    server_version = "PepsLiveLocal/1.0"
    protocol_version = "HTTP/1.1"

    @property
    def relay(self) -> RelayState:
        return self.server.relay  # type: ignore[attr-defined]

    def _send_bytes(self, payload: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()
        self.wfile.write(payload)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._send_bytes(body, "application/json; charset=utf-8", status)

    def _query(self) -> dict[str, list[str]]:
        return parse_qs(urlsplit(self.path).query)

    def _body_json(self) -> dict:
        try:
            size = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(size) if size else b"{}"
            value = json.loads(raw.decode("utf-8"))
            return value if isinstance(value, dict) else {}
        except (ValueError, TypeError, json.JSONDecodeError):
            return {}

    def _token(self, body: dict | None = None) -> str | None:
        query = self._query()
        return (body or {}).get("token") or (query.get("token") or [None])[0]

    def _is_loopback(self) -> bool:
        return self.client_address[0] in {"127.0.0.1", "::1"}

    def _sse_headers(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

    def _sse_event(self, name: str, payload: dict, event_id: int | None = None) -> None:
        lines = []
        if event_id is not None:
            lines.append(f"id: {event_id}")
        lines.append(f"event: {name}")
        lines.append(f"data: {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))}")
        self.wfile.write(("\n".join(lines) + "\n\n").encode("utf-8"))
        self.wfile.flush()

    def _remote_stream(self) -> None:
        query = self._query()
        try:
            since = max(0, int((query.get("since") or [0])[0]))
        except ValueError:
            since = 0

        self._sse_headers()
        try:
            self.wfile.write(b": pepslive remote stream connected\n\n")
            self.wfile.flush()

            initial = self.relay.events_after(since)
            for event in initial["events"]:
                self._sse_event("spin", event, int(event["id"]))
                since = int(event["id"])
            self._sse_event("ready", {"latest": initial["latest"]})

            while True:
                payload = self.relay.wait_events_after(since, timeout=20.0)
                events = payload["events"]
                if events:
                    for event in events:
                        self._sse_event("spin", event, int(event["id"]))
                        since = int(event["id"])
                else:
                    self.wfile.write(b": heartbeat\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            return

    def _state_stream(self) -> None:
        query = self._query()
        try:
            revision = max(0, int((query.get("revision") or [0])[0]))
        except ValueError:
            revision = 0

        self._sse_headers()
        try:
            self.wfile.write(b": pepslive state stream connected\n\n")
            self.wfile.flush()

            initial = self.relay.state_info()
            if initial["ready"]:
                self._sse_event("state", initial, int(initial["revision"]))
                revision = int(initial["revision"])
            self._sse_event("ready", {"revision": revision})

            while True:
                payload = self.relay.wait_state_after(revision, timeout=20.0)
                if payload["ready"] and int(payload["revision"]) != revision:
                    self._sse_event("state", payload, int(payload["revision"]))
                    revision = int(payload["revision"])
                else:
                    self.wfile.write(b": heartbeat\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            return

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlsplit(self.path).path
        if path in {"/remote", "/remote/"}:
            self.send_response(302)
            self.send_header("Location", "/remote.html")
            self.end_headers()
            return
        if path == "/api/remote/info":
            self._send_json(self.relay.info())
            return
        if path == "/api/state":
            self._send_json(self.relay.state_info())
            return
        if path == "/api/state/stream":
            self._state_stream()
            return
        if path == "/api/remote/status":
            valid = self.relay.valid(self._token())
            self._send_json({"ok": valid, "authorized": valid, "server": APP_NAME}, 200 if valid else 403)
            return
        if path == "/api/remote/events":
            query = self._query()
            try:
                since = max(0, int((query.get("since") or [0])[0]))
            except ValueError:
                since = 0
            self._send_json(self.relay.events_after(since))
            return
        if path == "/api/remote/stream":
            if not self._is_loopback():
                self._send_json({"ok": False, "error": "control_localhost_only"}, 403)
                return
            self._remote_stream()
            return
        if path == "/api/remote/qr.svg":
            token = self._token()
            if not self.relay.valid(token):
                self._send_json({"ok": False, "error": "invalid_token"}, 403)
                return
            try:
                payload = qr_svg(self.relay.remote_url())
            except ValueError as error:
                self._send_json({"ok": False, "error": str(error)}, 500)
                return
            self._send_bytes(payload, "image/svg+xml; charset=utf-8")
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlsplit(self.path).path
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length > MAX_STATE_BYTES:
            self._send_json({"ok": False, "error": "state_payload_too_large"}, 413)
            return
        body = self._body_json()
        if path == "/api/state":
            if not self._is_loopback():
                self._send_json({"ok": False, "error": "control_localhost_only"}, 403)
                return
            incoming = body.get("state")
            if not isinstance(incoming, dict):
                self._send_json({"ok": False, "error": "invalid_state"}, 400)
                return
            self._send_json(self.relay.publish_state(incoming))
            return
        if path == "/api/remote/spin":
            if not self.relay.valid(self._token(body)):
                self._send_json({"ok": False, "error": "invalid_token"}, 403)
                return
            accepted, payload = self.relay.spin()
            self._send_json(payload, 200 if accepted else 429)
            return
        if path == "/api/remote/token/rotate":
            if not self._is_loopback():
                self._send_json({"ok": False, "error": "control_localhost_only"}, 403)
                return
            self.relay.rotate()
            self._send_json(self.relay.info())
            return
        self._send_json({"ok": False, "error": "not_found"}, 404)

    def log_message(self, format: str, *args: object) -> None:
        print(f"[LocalServer] {self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--bind", default="0.0.0.0")
    args = parser.parse_args()

    relay = RelayState(args.port)
    handler = partial(RelayHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    server.relay = relay  # type: ignore[attr-defined]
    print(f"{APP_NAME} local server")
    print(f"Control: http://127.0.0.1:{args.port}/")
    print(f"Remote:  {relay.remote_url()}")
    print("Press Ctrl+C in this window to stop the server.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
