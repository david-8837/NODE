"""Tiny time-based digital-input debounce state machine for CircuitPython."""


class DebouncedInput:
    def __init__(self, initial_value, debounce_seconds=0.005):
        if debounce_seconds < 0:
            raise ValueError("debounce_seconds must not be negative")
        self.debounce_seconds = debounce_seconds
        self.raw_value = bool(initial_value)
        self.stable_value = bool(initial_value)
        self.changed_at = 0.0

    def update(self, raw_value, now):
        """Return the new stable bool on an edge, otherwise return None."""
        raw_value = bool(raw_value)
        if raw_value != self.raw_value:
            self.raw_value = raw_value
            self.changed_at = now
            return None
        # Tiny epsilon prevents binary floating-point rounding from delaying an
        # edge that has actually met the configured interval.
        if raw_value != self.stable_value and now - self.changed_at + 1e-9 >= self.debounce_seconds:
            self.stable_value = raw_value
            return self.stable_value
        return None
