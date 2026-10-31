#!/usr/bin/env python3
"""Generate the step status of the SYSMOD projects for the SYSMOD Map.

The JSON file is read-only: it is fully regenerated from the SysML v2 sources
each time the library or the examples change. Do not edit it by hand.

Sources:
  SYSMOD.sysml        the steps of SYSMODDefaultProcess (action usages annotated with @StepStatus),
                      the literals of StepStatusKind, and the defaults of the StepStatus metadata
  examples/*.sysml    the #project occurrence defs; a project sets the status of a step by
                      redefining it in its default process (with SYSMOD::SYSMODProcesses::* imported):

                        action :>> defaultProcess {
                            action :>> pitchSystemIdea { @StepStatus { status = StepStatusKind::done; percentage = 1.0 as Percentage; } }
                        }

                      Steps a project does not redefine keep the defaults of the library.

Output:
  examples/views/sysmodMapStatus.json
    { "library": ..., "steps": [{"name", "type"}...],
      "projects": [{"name", "file", "steps": {<step>: {"status", "percentage", "source"}}}] }
  The SYSMOD Map assigns each step to the cells it produces and shows status and percentage per cell.

Usage:
  python scripts/generate_map_status.py           write examples/views/sysmodMapStatus.json
  python scripts/generate_map_status.py --check   exit 1 if the file is out of date
"""

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # keep scripts/__pycache__ out of the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_views_doc import (  # noqa: E402  (reuse the minimal SysML v2 parser)
    EXAMPLES_DIR,
    ROOT,
    SYSMOD_FILE,
    declared,
    find_package,
    library_version,
    parse,
    project_defs,
    short,
    typed_by,
    walk,
)

OUTPUT_FILE = EXAMPLES_DIR / "views" / "sysmodMapStatus.json"
WARNINGS = []


def warn(message):
    WARNINGS.append(message)


def is_step_status(element):
    """True for a metadata usage '@StepStatus' or '@SYSMODProcesses::StepStatus'."""
    words = element.words
    return len(words) >= 2 and words[0] == "@" and short(words[1]) == "StepStatus"


def read_library(sysmod_elements):
    """The steps of the default process in order, the status literals, and the metadata defaults."""
    processes = find_package(sysmod_elements, "SYSMODProcesses")

    default_process = next(
        (e for e in walk(processes.children) if declared(e, "action", "def") == "SYSMODDefaultProcess"), None)
    if default_process is None:
        raise SystemExit("error: action def SYSMODDefaultProcess not found")
    steps = []
    for child in default_process.children:
        name = declared(child, "action")
        if name and any(is_step_status(c) for c in child.children):
            steps.append({"name": name, "type": short(typed_by(child) or "")})

    literals = []
    status_kind = next((e for e in walk(processes.children) if declared(e, "enum", "def") == "StepStatusKind"), None)
    if status_kind is not None:
        literals = [c.words[0] for c in status_kind.children if c.words]

    defaults = {"status": "open", "percentage": 0.0}
    metadata = next((e for e in walk(processes.children) if declared(e, "metadata", "def") == "StepStatus"), None)
    if metadata is not None:
        for child in metadata.children:
            words = child.words
            if declared(child, "attribute") == "status" and "default" in words:
                defaults["status"] = short(words[words.index("default") + 1])
            if declared(child, "attribute") == "percentage" and "=" in words:
                defaults["percentage"] = float(words[words.index("=") + 1])
    return steps, literals, defaults


def assignment(element):
    """(feature, value) of a metadata body statement 'status = X;' or ':>> status = X;'."""
    words = [w for w in element.words if w not in (":>>", "redefines")]
    if len(words) >= 3 and words[1] == "=":
        return words[0], words[2]
    return None, None


def read_project_status(project, steps, literals, defaults, file_label):
    """The status of every step of one project: redefined steps from the model, others from the defaults."""
    step_names = [s["name"] for s in steps]
    status = {name: dict(defaults, source="default") for name in step_names}

    process = next((c for c in project.children if c.words[:3] == ["action", ":>>", "defaultProcess"]), None)
    if process is None:
        return status

    for child in process.children:
        if child.words[:2] != ["action", ":>>"] or len(child.words) < 3:
            continue
        name = child.words[2]
        if name not in status:
            warn(f"{file_label}: step '{name}' is not a step of SYSMODDefaultProcess")
            continue
        for meta in (c for c in child.children if is_step_status(c)):
            entry = status[name]
            entry["source"] = "model"
            for statement in meta.children:
                feature, value = assignment(statement)
                if feature == "status":
                    literal = short(value)
                    if literals and literal not in literals:
                        warn(f"{file_label}: step '{name}' has unknown status '{literal}'")
                    entry["status"] = literal
                elif feature == "percentage":
                    try:
                        percentage = float(value)
                    except ValueError:
                        warn(f"{file_label}: step '{name}' has a non-numeric percentage '{value}'")
                        continue
                    if not 0.0 <= percentage <= 1.0:
                        warn(f"{file_label}: step '{name}' has percentage {percentage} outside 0..1")
                    entry["percentage"] = percentage
    return status


def generate():
    _, sysmod_elements = parse(SYSMOD_FILE)
    steps, literals, defaults = read_library(sysmod_elements)
    if not steps:
        raise SystemExit("error: no steps with @StepStatus found in SYSMODDefaultProcess")

    projects = []
    for path in sorted(EXAMPLES_DIR.glob("*.sysml")):
        _, elements = parse(path)
        label = path.relative_to(ROOT).as_posix()
        for name, project in project_defs(elements):
            projects.append({
                "name": name.strip("'"),
                "file": label,
                "steps": read_project_status(project, steps, literals, defaults, label),
            })

    data = {
        "generated": "Generated by scripts/generate_map_status.py. Do not edit.",
        "library": library_version(sysmod_elements),
        "statusKinds": literals,
        "steps": steps,
        "projects": projects,
    }
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit 1 if the generated file is out of date")
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE, help="output file (default: %(default)s)")
    args = parser.parse_args()

    text = generate()
    for message in WARNINGS:
        print(f"warning: {message}", file=sys.stderr)

    if args.check:
        current = args.output.read_text(encoding="utf-8") if args.output.exists() else ""
        if current != text:
            print(f"{args.output.name} is out of date. Run: python scripts/generate_map_status.py", file=sys.stderr)
            return 1
        print(f"{args.output.name} is up to date.")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8", newline="\n")
    print(f"Wrote {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
