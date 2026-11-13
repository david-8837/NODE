"""Bounded newline-delimited input framing for CircuitPython USB CDC."""


class SerialLineReader:
    def __init__(self, max_line_bytes):
        if type(max_line_bytes) is not int or max_line_bytes < 1:
            raise ValueError("max_line_bytes must be a positive integer")
        self.max_line_bytes = max_line_bytes
        self.buffer = bytearray()
        self.discarding_oversized_line = False

    def feed(self, data):
        """Return (complete_lines, rejected_oversized_line_count).

        The internal buffer never grows beyond max_line_bytes. Once an
        overlong frame is seen, bytes are ignored until its newline delimiter.
        """
        lines = []
        rejected = 0
        for value in data:
            if value == 10:  # LF
                if self.discarding_oversized_line:
                    rejected += 1
                else:
                    lines.append(bytes(self.buffer))
                self.buffer = bytearray()
                self.discarding_oversized_line = False
            elif not self.discarding_oversized_line:
                if len(self.buffer) >= self.max_line_bytes:
                    self.buffer = bytearray()
                    self.discarding_oversized_line = True
                else:
                    self.buffer.append(value)
        return lines, rejected
