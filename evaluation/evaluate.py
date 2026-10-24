"""Starter evaluation utility. Replace sample records with manually reviewed ground truth."""
import json, pathlib
p=pathlib.Path(__file__).parent/'questions.json'
data=json.loads(p.read_text()) if p.exists() else []
print(f"Loaded {len(data)} reviewed question records.")
print("No performance metrics are reported automatically from unreviewed/demo cases.")
