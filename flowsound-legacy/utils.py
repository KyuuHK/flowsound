import os
import threading


def load_env(path=".env"):
    """Load KEY=VALUE pairs from a .env file into os.environ.

    Existing environment variables take precedence over file values.
    """
    if not os.path.exists(path):
        return
    with open(path) as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def format_mmss(seconds):
    """Format a number of seconds as MM:SS."""
    seconds = max(0, int(seconds))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


class PomodoroTimer:
    """Full Pomodoro cycle state machine.

    WORK -> (x4) -> LONG_BREAK -> reset; short breaks between work sessions.
    """

    WORK_MINUTES = 25
    SHORT_BREAK_MINUTES = 5
    LONG_BREAK_MINUTES = 15
    SESSIONS_PER_CYCLE = 4

    PHASE_WORK = "work"
    PHASE_SHORT_BREAK = "short_break"
    PHASE_LONG_BREAK = "long_break"

    PHASE_LABELS = {
        PHASE_WORK: "Focus",
        PHASE_SHORT_BREAK: "Short Break",
        PHASE_LONG_BREAK: "Long Break",
    }

    def __init__(self):
        self.phase = self.PHASE_WORK
        self.remaining = self.WORK_MINUTES * 60
        self.completed_sessions = 0
        self.running = False
        self._lock = threading.Lock()

    @property
    def current_session(self):
        return self.completed_sessions + 1

    @property
    def phase_label(self):
        return self.PHASE_LABELS[self.phase]

    @property
    def phase_duration(self):
        return self._phase_seconds(self.phase)

    def _phase_seconds(self, phase):
        if phase == self.PHASE_SHORT_BREAK:
            return self.SHORT_BREAK_MINUTES * 60
        if phase == self.PHASE_LONG_BREAK:
            return self.LONG_BREAK_MINUTES * 60
        return self.WORK_MINUTES * 60

    def toggle(self):
        with self._lock:
            self.running = not self.running
        return self.running

    def reset(self):
        with self._lock:
            self.phase = self.PHASE_WORK
            self.remaining = self.WORK_MINUTES * 60
            self.completed_sessions = 0
            self.running = False

    def skip(self):
        """Advance immediately to the next phase."""
        with self._lock:
            self._advance_phase()

    def tick(self):
        """Advance one second. Returns True when a phase transition occurred."""
        with self._lock:
            if not self.running:
                return False
            self.remaining -= 1
            if self.remaining <= 0:
                self._advance_phase()
                return True
            return False

    def _advance_phase(self):
        if self.phase == self.PHASE_WORK:
            self.completed_sessions += 1
            if self.completed_sessions % self.SESSIONS_PER_CYCLE == 0:
                self.phase = self.PHASE_LONG_BREAK
            else:
                self.phase = self.PHASE_SHORT_BREAK
        else:
            self.phase = self.PHASE_WORK
        self.remaining = self._phase_seconds(self.phase)
