import subprocess
import sys
import importlib.util
from io import BytesIO
from pathlib import Path
import stat
import unittest
from zipfile import ZipFile, ZipInfo

spec = importlib.util.spec_from_file_location("installer", Path(__file__).with_name("install-secure-browser.py"))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class BrowserArchiveBoundaryTests(unittest.TestCase):
    def members(self, names):
        stream = BytesIO()
        with ZipFile(stream, "w") as archive:
            for name, mode in names:
                item = ZipInfo(name)
                item.filename = name
                item.orig_filename = name
                item.external_attr = mode << 16
                archive.writestr(item, b"inert fixture")
        stream.seek(0)
        return ZipFile(stream)

    def test_local_archive_override_is_rejected_before_io(self):
        result = subprocess.run([sys.executable, str(Path(__file__).with_name("install-secure-browser.py")), "--archive", "synthetic-unused-path"], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("overrides are unsupported", result.stderr)

    def test_rejects_paths_outside_expected_root(self):
        for name in ("../outside", "/chrome-linux64/chrome", "chrome-linux64/../outside", "chrome-linux64\\chrome", "C:/chrome-linux64/chrome", "other/chrome"):
            with self.subTest(name=name), self.members([(name, stat.S_IFREG)]) as archive:
                with self.assertRaises(ValueError):
                    installer.safe_members(archive, "chrome-linux64")

    def test_rejects_symlink_and_case_collisions(self):
        for entries in ([('chrome-linux64/chrome', stat.S_IFLNK)], [('chrome-linux64/chrome', stat.S_IFREG), ('chrome-linux64/CHROME', stat.S_IFREG)]):
            with self.members(entries) as archive, self.assertRaises(ValueError):
                installer.safe_members(archive, "chrome-linux64")

    def test_accepts_regular_browser_files(self):
        with self.members([('chrome-linux64/chrome', stat.S_IFREG)]) as archive:
            self.assertEqual(len(installer.safe_members(archive, "chrome-linux64")), 1)


if __name__ == "__main__":
    unittest.main()
