import json, unittest, subprocess, sys, tempfile, importlib.util, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('local_tool',ROOT/'tool.py'); tool=importlib.util.module_from_spec(spec); spec.loader.exec_module(tool)
class Tests(unittest.TestCase):
    def test_frozen_oracles(self):
        raw=(ROOT/'examples/cases.json').read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),json.loads((ROOT/'examples/manifest.json').read_text())['cases_sha256'])
        for case in json.loads(raw):
            with self.subTest(case=case['name']): self.assertEqual(tool.analyze(case['input']),case['expected'])
    def test_cli_decisions(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            for case in json.loads((ROOT/'examples/cases.json').read_text()):
                (p/'in.json').write_text(json.dumps(case['input']))
                run=subprocess.run([sys.executable,str(ROOT/'tool.py'),'--input',str(p/'in.json'),'--output',str(p/'out.json')],capture_output=True,text=True)
                self.assertEqual(run.returncode,1 if case['expected']['decision']=='failure' else 0,run.stderr)
                self.assertEqual(json.loads((p/'out.json').read_text()),case['expected'])
    def test_malformed_cli(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            for bad in ['{}','[]','not json','{"x":NaN}']:
                (p/'in.json').write_text(bad)
                run=subprocess.run([sys.executable,str(ROOT/'tool.py'),'--input',str(p/'in.json'),'--output',str(p/'out.json')],capture_output=True,text=True)
                self.assertEqual(run.returncode,2,run.stderr)
                self.assertFalse((p/'out.json').exists())
    def test_bounded_json_and_duplicate_keys(self):
        deep='{"x":'+('['*33)+'0'+(']'*33)+'}'
        payloads=[('{"x":1,"x":2}','duplicate JSON key'),
                  (deep,'nesting exceeds 32'),
                  ('{"x":"'+'x'*2_000_000+'"}','input exceeds 2MB'),
                  (json.dumps({'x':list(range(1001))}),'container exceeds 1000'),
                  ('{"x":1e999}','nonfinite'),
                  ('{"x":Infinity}','nonfinite')]
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            for raw, expected_error in payloads:
                with self.subTest(error=expected_error):
                    (p/'in.json').write_text(raw)
                    run=subprocess.run([sys.executable,str(ROOT/'tool.py'),'--input',str(p/'in.json'),'--output',str(p/'out.json')],capture_output=True,text=True)
                    self.assertEqual(run.returncode,2,run.stderr)
                    self.assertIn(expected_error,run.stderr)
                    self.assertFalse((p/'out.json').exists())

    def test_output_cannot_overwrite_input(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); source=p/'input.json'
            original=(ROOT/'examples/input.json').read_bytes(); source.write_bytes(original)
            run=subprocess.run([sys.executable,str(ROOT/'tool.py'),'--input',str(source),'--output',str(source)],capture_output=True,text=True)
            self.assertEqual(run.returncode,2)
            self.assertIn('overwrite',run.stderr)
            self.assertEqual(source.read_bytes(),original)
            alias=p/'alias.json'; alias.symlink_to(source)
            run=subprocess.run([sys.executable,str(ROOT/'tool.py'),'--input',str(source),'--output',str(alias)],capture_output=True,text=True)
            self.assertEqual(run.returncode,2)
            self.assertEqual(source.read_bytes(),original)

if __name__=='__main__':unittest.main()
