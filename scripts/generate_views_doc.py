#!/usr/bin/env python3
"""Generate SYSMODViews.md from the SYSMODViews library.

The Markdown file is read-only: it is fully regenerated from the SysML v2 sources
each time the library changes. Do not edit it by hand.

Sources:
  SYSMOD15288.sysml   ISO 15288 processes (ISO15288Processes) with their stakeholders and concerns
  SYSMODViews.sysml   viewpoints, views
  SYSMOD.sysml        SYSMOD process steps refining the ISO 15288 processes
  examples/*.sysml    view usages of the #project occurrence defs, linking the SYSMOD steps to the views
  examples/views/     example SVG renderings; the first 'SYSMODViews::<ViewDef>' in a file names its view

Traceability:
  process    <- stakeholder   "(ISO/IEC/IEEE 15288 <process names> process[es])" in the stakeholder doc
  stakeholder <- concern      stakeholder features of the concern def
  concern    <- viewpoint     frame concern features of the viewpoint def
  viewpoint  <- view          satisfy requirement features of the view def (including inherited ones)

View dependencies (correspondences between the views, chapter 6):
  view       -> artifact      #viewedArtifact dependencies in SYSMODViews.sysml (inherited if not declared)
  artifact   -> artifact      builds on: inputs of the SYSMOD step (or of its nested action) creating the artifact,
                              i.e., the flows and bindings of SYSMODDefaultProcess and the step parameters in SYSMOD.sysml
                              traces to: relationships of the Project features in SYSMOD.sysml
                              (specialization of the system contexts, frame, satisfy, subject, allocate)
  view       -> view          lifted from the artifacts the views show

Usage:
  python scripts/generate_views_doc.py           write SYSMODViews.md
  python scripts/generate_views_doc.py --check   exit 1 if SYSMODViews.md is out of date
"""

import argparse
import re
import sys
import textwrap
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIEWS_FILE = ROOT / "SYSMODViews.sysml"
SYSMOD_FILE = ROOT / "SYSMOD.sysml"
ISO15288_FILE = ROOT / "SYSMOD15288.sysml"
EXAMPLES_DIR = ROOT / "examples"
RENDERED_VIEWS_DIR = EXAMPLES_DIR / "views"
OUTPUT_FILE = ROOT / "SYSMODViews.md"

PROCESS_GROUPS = {
    "Agreement Processes",
    "Organizational Project-Enabling Processes",
    "Technical Management Processes",
    "Technical Processes",
}

# ---------------------------------------------------------------------------
# Minimal SysML v2 textual notation parser
# ---------------------------------------------------------------------------

TOKEN_RE = re.compile(
    r"""
    (?P<comment>/\*.*?\*/)
  | (?P<linecomment>//[^\n]*)
  | (?P<string>"(?:\\.|[^"\\])*")
  | (?P<name>'(?:\\.|[^'\\])*'|[A-Za-z_]\w*(?:::(?:[A-Za-z_]\w*|\*))*)
  | (?P<number>\d+(?:\.\d+)?)
  | (?P<op>:>>|::>|:>|->|==|!=|<=|>=|:=|\.\.)
  | (?P<ws>\s+)
  | (?P<sym>.)
    """,
    re.VERBOSE | re.DOTALL,
)


@dataclass
class Token:
    kind: str
    text: str
    start: int
    end: int


@dataclass
class Element:
    """A statement of the textual notation: header tokens and an optional body."""

    header: list
    children: list = field(default_factory=list)
    doc: str = ""
    start: int = 0
    end: int = 0
    group: str = ""  # text of the last //-comment heading before the element

    @property
    def words(self):
        return [t.text for t in self.header]

    def all_tokens(self):
        tokens = list(self.header)
        for child in self.children:
            tokens.extend(child.all_tokens())
        return tokens


def tokenize(source):
    tokens = []
    for m in TOKEN_RE.finditer(source):
        kind = m.lastgroup
        if kind == "ws":
            continue
        tokens.append(Token(kind, m.group(), m.start(), m.end()))
    return tokens


def clean_comment(text):
    body = text[2:-2]
    lines = [re.sub(r"^\s*\*?", "", line).strip() for line in body.splitlines()]
    return " ".join(line for line in lines if line)


def parse_body(tokens, i):
    """Parse statements until the closing brace or the end. Returns (elements, index)."""
    elements = []
    header = []
    group = ""
    while i < len(tokens):
        tok = tokens[i]
        if tok.kind == "linecomment":
            text = tok.text[2:].strip()
            if text:
                group = text
            i += 1
            continue
        if tok.kind == "comment":
            # doc comment: "doc /* ... */" without semicolon
            if header and header[-1].text == "doc" and len(header) == 1:
                elements.append(Element([], doc=clean_comment(tok.text), start=header[0].start, end=tok.end))
                elements[-1].header = [Token("doc", "doc", header[0].start, tok.end)]
                header = []
            i += 1
            continue
        if tok.text == "}":
            if header:
                elements.append(Element(header, start=header[0].start, end=header[-1].end, group=group))
            return elements, i
        if tok.text == ";":
            if header:
                elements.append(Element(header, start=header[0].start, end=tok.end, group=group))
            header = []
            i += 1
            continue
        if tok.text == "{":
            children, j = parse_body(tokens, i + 1)
            start = header[0].start if header else tok.start
            end = tokens[j].end if j < len(tokens) else tok.end
            element = Element(header, children, start=start, end=end, group=group)
            docs = [c.doc for c in children if c.words == ["doc"] and c.doc]
            element.doc = " ".join(docs)
            element.children = [c for c in children if c.words != ["doc"]]
            elements.append(element)
            header = []
            i = j + 1
            continue
        header.append(tok)
        i += 1
    if header:
        elements.append(Element(header, start=header[0].start, end=header[-1].end, group=group))
    return elements, i


def parse(path):
    source = path.read_text(encoding="utf-8")
    elements, _ = parse_body(tokenize(source), 0)
    return source, elements


def walk(elements):
    for element in elements:
        yield element
        yield from walk(element.children)


def find_package(elements, name):
    for element in walk(elements):
        words = element.words
        if "package" in words and words[words.index("package") + 1:words.index("package") + 2] == [name]:
            return element
    raise SystemExit(f"error: package {name} not found")


def declared(element, *keywords):
    """Return the declared name if the header starts with the given keywords (ignoring prefixes)."""
    words = element.words
    for prefix in ("abstract", "private", "public", "library"):
        if words and words[0] == prefix:
            words = words[1:]
    n = len(keywords)
    if words[:n] == list(keywords) and len(words) > n and words[n] not in (":", ":>", ":>>"):
        return words[n]
    return None


def typed_by(element):
    """The type or specialized general type in the header (after ':' or ':>')."""
    words = element.words
    for op in (":", ":>"):
        if op in words:
            idx = words.index(op) + 1
            if idx < len(words):
                return words[idx]
    return None


def short(name):
    return name.split("::")[-1] if name else name


# ---------------------------------------------------------------------------
# Model extraction
# ---------------------------------------------------------------------------


@dataclass
class Process:
    name: str
    doc: str
    group: str
    steps: list = field(default_factory=list)
    stakeholders: list = field(default_factory=list)

    @property
    def title(self):
        return humanize(self.name)


@dataclass
class Stakeholder:
    name: str
    doc: str
    processes: list = field(default_factory=list)
    concerns: list = field(default_factory=list)


@dataclass
class Concern:
    name: str
    doc: str
    stakeholders: list = field(default_factory=list)
    viewpoints: list = field(default_factory=list)


@dataclass
class Viewpoint:
    name: str
    doc: str
    concerns: list = field(default_factory=list)
    element_types: list = field(default_factory=list)
    views: list = field(default_factory=list)


@dataclass
class View:
    name: str
    doc: str
    general: str
    abstract: bool
    own_viewpoints: list
    filters: list
    renderings: list
    source: str
    specializations: list = field(default_factory=list)
    examples: list = field(default_factory=list)
    steps: list = field(default_factory=list)  # (SYSMOD step, qualified view usage in a project)
    own_artifacts: list = field(default_factory=list)  # Project features from #viewedArtifact dependencies
    artifacts: list = field(default_factory=list)  # own or inherited
    builds_on: dict = field(default_factory=dict)  # view -> artifacts of that view read by the steps creating this view's artifacts
    traces_to: dict = field(default_factory=dict)  # view -> relationship labels between the artifacts
    input_for: list = field(default_factory=list)
    external_inputs: list = field(default_factory=list)  # step inputs not created by a step, e.g., brownfieldArchitecture


@dataclass
class Artifact:
    """A feature of the SYSMOD Project, e.g., 'problemStatement' or 'specificationContext.useCases' ('this' is the Project)."""

    name: str
    step: str = ""  # SYSMOD step (action def) creating the artifact
    action: str = ""  # nested action of the step creating the artifact, if any
    updated_by: list = field(default_factory=list)  # later SYSMOD steps updating the artifact (inout parameter)
    inputs: list = field(default_factory=list)  # artifacts the creating step or action reads
    external_inputs: list = field(default_factory=list)
    relations: list = field(default_factory=list)  # (label, other artifact)


def humanize(name):
    words = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name).split()
    return " ".join(w.lower() if w in ("And", "Or") else w for w in words)


def link(kind, name):
    return f"[{name}](#{anchor(kind, name)})"


def anchor(kind, name):
    return f"{kind}-{name}".lower()


def read_processes(package, sysmod_elements):
    processes = {}
    for element in package.children:
        name = declared(element, "action", "def")
        if name:
            group = element.group if element.group in PROCESS_GROUPS else ""
            processes[name] = Process(name, element.doc, group)
    # carry the group heading forward to the following processes
    group = ""
    for process in processes.values():
        group = process.group or group
        process.group = group

    steps = find_package(sysmod_elements, "SYSMODProcesses")
    for element in steps.children:
        words = element.words
        if words[:3] == ["#", "refinement", "dependency"] and "to" in words:
            step = words[3]
            target = short(words[words.index("to") + 1])
            if target in processes:
                processes[target].steps.append(step)
            else:
                warn(f"refinement of unknown ISO 15288 process {target} by {step}")
    return processes


def read_stakeholders(package, processes):
    stakeholders = {}
    titles = sorted(((p.title, p.name) for p in processes.values()), key=lambda t: -len(t[0]))
    for element in package.children:
        name = declared(element, "part", "def")
        if not name:
            continue
        stakeholder = Stakeholder(name, element.doc)
        refs = re.findall(r"\(ISO/IEC/IEEE 15288 (.+?) process(?:es)?\)", element.doc)
        for ref in refs:
            rest = ref
            for title, pname in titles:
                pattern = r"\b" + re.escape(title) + r"\b"
                if re.search(pattern, rest, re.IGNORECASE):
                    rest = re.sub(pattern, " ", rest, flags=re.IGNORECASE)
                    if pname not in stakeholder.processes:
                        stakeholder.processes.append(pname)
            leftover = re.sub(r"\b(and|or)\b|[,\s]", "", rest)
            if leftover:
                warn(f"stakeholder {name}: unresolved ISO 15288 process reference '{ref}'")
        if not refs:
            warn(f"stakeholder {name}: no ISO 15288 process reference in its doc")
        # keep the order of the ISO15288Processes package
        order = list(processes)
        stakeholder.processes.sort(key=order.index)
        for pname in stakeholder.processes:
            processes[pname].stakeholders.append(name)
        stakeholders[name] = stakeholder
    return stakeholders


def read_concerns(package, stakeholders):
    concerns = {}
    for element in package.children:
        name = declared(element, "concern", "def")
        if not name:
            continue
        concern = Concern(name, element.doc)
        for child in element.children:
            if child.words and child.words[0] == "stakeholder":
                sname = short(typed_by(child))
                if sname not in stakeholders:
                    warn(f"concern {name}: unknown stakeholder {sname}")
                    continue
                concern.stakeholders.append(sname)
                stakeholders[sname].concerns.append(name)
        concerns[name] = concern
    return concerns


def read_viewpoints(package, concerns):
    constraint_types = {}
    for element in package.children:
        cname = declared(element, "constraint", "def")
        if cname:
            constraint_types[cname] = istype_names(element)

    viewpoints = {}
    for element in package.children:
        name = declared(element, "viewpoint", "def")
        if not name:
            continue
        viewpoint = Viewpoint(name, element.doc)
        for child in element.children:
            words = child.words
            if words[:2] == ["frame", "concern"]:
                cname = short(typed_by(child))
                if cname not in concerns:
                    warn(f"viewpoint {name}: unknown concern {cname}")
                    continue
                viewpoint.concerns.append(cname)
                concerns[cname].viewpoints.append(name)
            elif words[:2] == ["require", "constraint"]:
                types = istype_names(child)
                for token in child.all_tokens():
                    types += [t for t in constraint_types.get(token.text, []) if t not in types]
                viewpoint.element_types += [t for t in types if t not in viewpoint.element_types]
        viewpoints[name] = viewpoint
    return viewpoints


def istype_names(element):
    tokens = element.all_tokens()
    return [tokens[i + 1].text for i, t in enumerate(tokens[:-1]) if t.text == "istype"]


def read_views(elements, source, viewpoints):
    views = {}
    for element in elements:
        name = declared(element, "view", "def")
        if not name:
            continue
        own_viewpoints, filters, renderings = [], [], []
        for child in element.children:
            words = child.words
            if words[:2] == ["satisfy", "requirement"]:
                vname = short(typed_by(child))
                if vname in viewpoints:
                    own_viewpoints.append(vname)
                else:
                    warn(f"view {name}: unknown viewpoint {vname}")
            elif words and words[0] == "filter":
                filters.append(source_text(source, child, strip=";"))
            elif words and words[0] == "render":
                renderings.append(short(words[1]))
        views[name] = View(
            name=name,
            doc=element.doc,
            general=short(typed_by(element)),
            abstract=element.words[0] == "abstract",
            own_viewpoints=own_viewpoints,
            filters=filters,
            renderings=renderings,
            source=source_text(source, element),
        )
    for view in views.values():
        if view.general in views:
            views[view.general].specializations.append(view.name)
    for view in views.values():
        for vname in all_viewpoints(view, views):
            viewpoints[vname].views.append(view.name)
    return views


def read_renderings(elements, source):
    renderings = {}
    for element in elements:
        name = declared(element, "rendering")
        if name and name != "def":
            renderings[name] = (element.doc, source_text(source, element))
    return renderings


def all_viewpoints(view, views):
    """Viewpoints satisfied by the view, including the ones inherited from its general views."""
    result = []
    current = view
    while current:
        result += [v for v in current.own_viewpoints if v not in result]
        current = views.get(current.general)
    return result


def inherited_renderings(view, views):
    current = view
    while current:
        if current.renderings:
            return current.renderings, current.name
        current = views.get(current.general)
    return [], None


def source_text(source, element, strip=""):
    text = source[element.start:element.end].rstrip(strip)
    # dedent continuation lines relative to the first line's indentation
    line_start = source.rfind("\n", 0, element.start) + 1
    indent = element.start - line_start
    return textwrap.dedent(" " * indent + text).strip()


def project_defs(elements):
    """The SYSMOD project definitions: SYSMOD::Project and the occurrence defs marked with #project."""
    for element in walk(elements):
        words = element.words
        if "occurrence" not in words or "def" not in words:
            continue
        name = words[words.index("def") + 1:]
        if name[:1] == ["<"] and ">" in name:
            name = name[name.index(">") + 1:]
        marked = any(w == "#" and short(n) == "project" for w, n in zip(words, words[1:]))
        if name and (marked or declared(element, "occurrence", "def") == "Project"):
            yield name[0], element


def read_step_views(sysmod_elements, project_files, views):
    """Link the SYSMOD steps to the views of the projects, i.e., SYSMOD::Project and the example projects.

    A view usage in a project exposes a project feature, e.g., 'expose problemStatement'.
    The step producing that feature is found by the flows of SYSMODDefaultProcess,
    e.g., 'flow from describeProblemStatement.problemStatement to project.problemStatement'.
    'expose this' exposes the project itself, which the steps assigning project features set up.
    """
    process_package = find_package(sysmod_elements, "SYSMODProcesses")
    step_types, producers = {}, {}
    for element in process_package.children:
        if declared(element, "action", "def") == "SYSMODDefaultProcess":
            for child in element.children:
                words = child.words
                if words[0] == "action" and ":" in words:
                    step_types[words[1]] = short(typed_by(child))
                elif words[:2] == ["flow", "from"] and words[-3:-1] == ["project", "."]:
                    producers.setdefault(words[-1], []).append(words[2])
    for usage, step in step_types.items():
        for step_element in process_package.children:
            if declared(step_element, "action", "def") == step and any(
                    c.words[:3] == ["assign", "project", "."] for c in step_element.children):
                producers.setdefault("this", []).append(usage)

    projects = list(project_defs(sysmod_elements))
    for path in project_files:
        projects += project_defs(parse(path)[1])
    for project_name, project in projects:
        for element in project.children:
            words = element.words
            if words[0] != "view" or ":" not in words:
                continue
            vtype = short(typed_by(element))
            if vtype not in views:
                continue
            for child in element.children:
                if child.words[0] != "expose":
                    continue
                # exposed elements outside the project, e.g., a use case package, have no producing step
                feature = re.split(r"::|\.", child.words[1])[0]
                for usage in producers.get(feature, []):
                    entry = (step_types[usage], f"{project_name}::{words[1]}")
                    if entry not in views[vtype].steps:
                        views[vtype].steps.append(entry)


def find_examples(views):
    """Example SVGs; the first 'SYSMODViews::<ViewDef>' in the file, e.g., in its header comment, names the view."""
    if not RENDERED_VIEWS_DIR.is_dir():
        return
    for path in sorted(RENDERED_VIEWS_DIR.glob("*.svg")):
        match = re.search(r"SYSMODViews::(\w+)", path.read_text(encoding="utf-8", errors="ignore"))
        if not match:
            warn(f"example {relpath(path)} does not name a SYSMODViews view")
        elif match.group(1) not in views:
            warn(f"example {relpath(path)}: unknown view {match.group(1)}")
        else:
            views[match.group(1)].examples.append(path)


# ---------------------------------------------------------------------------
# View dependencies
# ---------------------------------------------------------------------------

PARAMETER_KEYWORDS = {"in", "out", "inout", "abstract", "part", "item", "attribute", "concern", "requirement",
                      "verification", "use", "case", "ref", "occurrence", "action", "allocation"}


def parameter(element):
    """(direction, name, binding words) of a parameter 'in part x : T = A::b.c' or (None, None, None)."""
    words = element.words
    if not words or words[0] not in ("in", "out", "inout"):
        return None, None, None
    name = next((w for w in words[1:] if w not in PARAMETER_KEYWORDS), None)
    binding = words[words.index("=") + 1:] if "=" in words else []
    return words[0], name, binding


def dotted(words):
    """'A::b . c' -> 'A::b.c'"""
    return "".join(words)


def read_viewed_artifacts(library, views):
    for element in library.children:
        words = element.words
        if words[:3] != ["#", "viewedArtifact", "dependency"] or "to" not in words:
            continue
        clients = [w for w in words[3:words.index("to")] if w != ","]
        suppliers = " ".join(words[words.index("to") + 1:]).split(",")
        artifacts = []
        for supplier in suppliers:
            path = supplier.replace(" ", "").split("::")
            if path[0] != "Project":
                warn(f"viewedArtifact dependency of {', '.join(clients)} to {supplier.strip()} is not a Project feature")
                continue
            artifacts.append(".".join(path[1:]) or "this")
        for client in clients:
            if client not in views:
                warn(f"viewedArtifact dependency of unknown view {client}")
                continue
            views[client].own_artifacts += [a for a in artifacts if a not in views[client].own_artifacts]
    for view in views.values():
        current = view
        while current and not current.own_artifacts:
            current = views.get(current.general)
        view.artifacts = list(current.own_artifacts) if current else []


def read_artifacts(sysmod_elements):
    """The artifacts (Project features) with the SYSMOD step creating them, the inputs of that step, and their relationships."""
    package = find_package(sysmod_elements, "SYSMODProcesses")
    step_defs = {declared(e, "action", "def"): e for e in package.children if declared(e, "action", "def")}
    process = step_defs["SYSMODDefaultProcess"]

    usages, flows, binds = {}, {}, {}  # usage -> step; (usage, out) -> artifact; (usage, in) -> artifact or ("external", name)
    for child in process.children:
        words = child.words
        if words[0] == "action" and ":" in words:
            usages[words[1]] = short(typed_by(child))
            for param in child.children:
                direction, name, binding = parameter(param)
                if direction == "in" and binding:
                    target = dotted(binding).split("::")[-1]
                    if target.startswith("project."):
                        binds[(words[1], name)] = target[len("project."):]
                    else:
                        binds[(words[1], name)] = ("external", target)
        elif words[:2] == ["flow", "from"] and "to" in words:
            source = dotted(words[2:words.index("to")]).split(".")
            target = dotted(words[words.index("to") + 1:]).split(".")
            if target[0] == "project" and len(source) == 2:
                flows[(source[0], source[1])] = ".".join(target[1:])
        elif words[0] == "bind" and "=" in words:
            left = dotted(words[1:words.index("=")]).split(".")
            right = dotted(words[words.index("=") + 1:]).split(".")
            if left[0] == "project" and len(right) == 2:
                binds[(right[0], right[1])] = ".".join(left[1:])

    # Project features assigned by a step, e.g., 'assign project.projectOwner.name := ...' in SetupProject,
    # belong to the artifact 'this', the Project itself
    assigned = {}
    for step, definition in step_defs.items():
        for child in definition.children:
            if child.words[:3] == ["assign", "project", "."]:
                assigned[child.words[3]] = "this"
    for key, value in binds.items():
        if isinstance(value, str) and value.split(".")[0] in assigned:
            binds[key] = "this"

    artifacts = {}

    def artifact(name):
        return artifacts.setdefault(name, Artifact(name))

    for usage, step in usages.items():
        definition = step_defs.get(step)
        if definition is None:
            warn(f"unknown SYSMOD step {step}")
            continue
        ins, outs = [], []
        for child in definition.children:
            direction, name, _ = parameter(child)
            if direction in ("in", "inout"):
                ins.append(name)
            if direction in ("out", "inout"):
                outs.append(name)

        def resolve(param, ins=ins, outs=outs, usage=usage):
            """An input parameter of the step: an artifact name or ('external', name)."""
            if param in outs:
                return flows.get((usage, param), ("external", param))
            return binds.get((usage, param), ("external", param))

        def add_inputs(target, params):
            for param in params:
                source = resolve(param)
                if isinstance(source, tuple):
                    if source[1] not in target.external_inputs:
                        target.external_inputs.append(source[1])
                elif source != target.name and source not in target.inputs:
                    target.inputs.append(source)

        created = set()
        for nested in definition.children:
            if nested.words[0] != "action" or "def" in nested.words:
                continue
            nested_ins, nested_outs = [], []
            for child in nested.children:
                direction, name, binding = parameter(child)
                path = dotted(binding).split("::")[-1].split(".") if binding else []
                if direction == "in" and path:
                    nested_ins.append(path[0])
                elif direction == "out" and path and (usage, path[0]) in flows:
                    nested_outs.append(".".join([flows[(usage, path[0])]] + path[1:]))
            for name in nested_outs:
                a = artifact(name)
                a.step, a.action = step, nested.words[1]
                add_inputs(a, nested_ins)
                created.add(name)
        for out in outs:
            name = flows.get((usage, out))
            if name is None:
                warn(f"output {out} of {step} does not flow into a Project feature")
                continue
            if name not in created:
                a = artifact(name)
                if a.step and a.step != step:
                    # an earlier step created the artifact, this step updates it, e.g., SpecifyVerificationContext
                    if step not in a.updated_by:
                        a.updated_by.append(step)
                else:
                    a.step = step
                add_inputs(a, ins)
        if any(c.words[:3] == ["assign", "project", "."] for c in definition.children):
            a = artifact("this")
            a.step = step
            add_inputs(a, ins)

    # relationships between the Project features
    project = next(element for name, element in project_defs(sysmod_elements) if name == "Project")
    features = {}
    for child in project.children:
        words = child.words
        if len(words) > 1 and words[0] in PARAMETER_KEYWORDS:
            features[words[1]] = child

    def feature_of(words):
        path = dotted(words).split("::")[-1].split(".")
        return path[0] if path[0] in features else None

    for name, child in features.items():
        words = child.words
        relations = []
        if words[0] == "allocation" and "allocate" in words and "to" in words:
            relations += [("allocates", feature_of(words[words.index("allocate") + 1:words.index("to")])),
                          ("allocates to", feature_of(words[words.index("to") + 1:]))]
        elif ":>" in words:
            relations += [("specializes", w) for w in words[words.index(":>") + 1:] if w in features]
        for nested in walk(child.children):
            nwords = nested.words
            if nwords and nwords[0] == "frame":
                relations.append(("frames", feature_of(nwords[1:])))
            elif nwords and nwords[0] == "satisfy":
                relations.append(("satisfies", feature_of(nwords[1:])))
            elif nwords and nwords[0] == "subject" and ":>" in nwords:
                relations.append(("has its subject in", feature_of(nwords[nwords.index(":>") + 1:])))
        for label, target in relations:
            if target and target != name and (label, target) not in artifact(name).relations:
                artifact(name).relations.append((label, target))
    return artifacts, list(usages.values())


def lookup(artifacts, name):
    """The artifact or, for a nested feature such as 'verificationContext.verificationCases', its owning artifact."""
    path = name.split(".")
    while path:
        if ".".join(path) in artifacts:
            return artifacts[".".join(path)]
        path = path[:-1]
    return None


def link_view_dependencies(views, artifacts):
    """Lift the dependencies of the artifacts to the views showing them.

    Only views that declare their own artifacts are targets, e.g., ProblemStatementView, not ProblemStatementAIView,
    which inherits the artifacts and therefore the dependencies.
    """
    primary = [v for v in views.values() if v.own_artifacts and not v.abstract]
    for view in views.values():
        for name in view.artifacts:
            a = lookup(artifacts, name)
            if a is None:
                continue
            view.external_inputs += [e for e in a.external_inputs if e not in view.external_inputs]
            for other in primary:
                if other is view or other.own_artifacts == view.artifacts:
                    continue
                for source in a.inputs:
                    if source in other.artifacts and source not in view.artifacts:
                        view.builds_on.setdefault(other.name, [])
                        if source not in view.builds_on[other.name]:
                            view.builds_on[other.name].append(source)
                for label, target in a.relations:
                    if target in other.artifacts and target not in view.artifacts:
                        view.traces_to.setdefault(other.name, [])
                        relation = f"{name} {label} {target}"
                        if relation not in view.traces_to[other.name]:
                            view.traces_to[other.name].append(relation)
    for view in primary:
        for other in view.builds_on:
            if view.name not in views[other].input_for:
                views[other].input_for.append(view.name)


def creating_steps(view, artifacts):
    found = [lookup(artifacts, a) for a in view.artifacts]
    return unique(step for a in found if a and a.step for step in [a.step] + a.updated_by)


WARNINGS = []


def warn(message):
    WARNINGS.append(message)


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------


def names(kind, items):
    return ", ".join(link(kind, i) for i in items) if items else "—"


def cell(text):
    return text.replace("|", "\\|")


def relpath(path):
    return path.relative_to(ROOT).as_posix()


def render(version, processes, stakeholders, concerns, viewpoints, views, renderings, artifacts, step_order):
    out = []
    w = out.append

    w("<!--")
    w("  GENERATED FILE - DO NOT EDIT.")
    w("  Generated from SYSMOD15288.sysml, SYSMODViews.sysml, and SYSMOD.sysml by scripts/generate_views_doc.py.")
    w("  Edit the library and rerun the script instead.")
    w("-->")
    w("")
    w("# SYSMOD Views")
    w("")
    w(f"> This document is generated from the SYSMODViews library ({version}). It is read-only; "
      "changes are made in [SYSMOD15288.sysml](SYSMOD15288.sysml) and [SYSMODViews.sysml](SYSMODViews.sysml) and the document is regenerated "
      "with `python scripts/generate_views_doc.py`.")
    w("")
    w("The SYSMOD views follow ISO/IEC/IEEE 42010: stakeholders derived from the ISO/IEC/IEEE 15288 "
      "life cycle processes have concerns, viewpoints frame these concerns, and views conform to the viewpoints. "
      "The SYSMOD process steps refine the ISO/IEC/IEEE 15288 processes and produce the project elements "
      "that the views of a SYSMOD project expose, e.g., in the Delivery Drone example.")
    w("")
    w("```mermaid")
    w("flowchart LR")
    w("    P[ISO 15288 Process] --> S[Stakeholder] --> C[Concern] --> VP[Viewpoint] --> V[View]")
    w("    P --> ST[SYSMOD Step] --> V")
    w("```")
    w("")
    w("**Views, dependencies, and paths.** The views do not depend on each other; the content they show does. "
      "Every view is a projection of the one SYSMOD Project model, and the model elements it exposes build on "
      "other model elements, e.g., the stakeholder needs on the problem statement and the stakeholders. "
      "SYSMOD therefore separates the framework from the method: the framework (this document) defines what the views "
      "show and for whom, the SYSMOD process (`Project::defaultProcess`) defines a path through the steps that create "
      "the content. The process is a default, not a mandatory sequence: all steps after `SetupProject` are optional, "
      "e.g., the brownfield system in a greenfield project, the steps can be revisited in iterations, and the whole "
      "process is applied again to the `subProjects` on the next level of the system hierarchy. "
      "Chapter [6. View Dependencies](#6-view-dependencies) shows which views build on which other views, "
      "derived from the library.")
    w("")
    w("## Contents")
    w("")
    w("1. [ISO 15288 Processes](#1-iso-15288-processes)")
    w("2. [Stakeholders](#2-stakeholders)")
    w("3. [Concerns](#3-concerns)")
    w("4. [Viewpoints](#4-viewpoints)")
    w("5. [Views](#5-views)")
    w("6. [View Dependencies](#6-view-dependencies)")
    w("")

    # 1. Processes
    w("## 1. ISO 15288 Processes")
    w("")
    w("The life cycle processes of ISO/IEC/IEEE 15288 as defined in the package `ISO15288Processes`, "
      "the stakeholders responsible for them, and the SYSMOD process steps that refine them.")
    w("")
    group = None
    for p in processes.values():
        if p.group != group:
            group = p.group
            w(f"### {group}")
            w("")
            w("| Process | Stakeholders | SYSMOD steps | Description |")
            w("|---|---|---|---|")
        anchor_tag = f'<a id="{anchor("process", p.name)}"></a>'
        steps = ", ".join(f"`{s}`" for s in p.steps) if p.steps else "—"
        w(f"| {anchor_tag}**{p.title}** | {names('stakeholder', p.stakeholders)} | {steps} | {cell(p.doc)} |")
        next_group = None
        keys = list(processes)
        idx = keys.index(p.name)
        if idx + 1 < len(keys):
            next_group = processes[keys[idx + 1]].group
        if next_group != group:
            w("")

    # 2. Stakeholders
    w("## 2. Stakeholders")
    w("")
    w("Stakeholders of the package `ISO15288Processes::Stakeholders`. Each one specializes `ExtendedStakeholder`.")
    w("")
    for s in stakeholders.values():
        w(f'<a id="{anchor("stakeholder", s.name)}"></a>')
        w("")
        w(f"### {s.name}")
        w("")
        w(s.doc)
        w("")
        processes_links = ", ".join(f"[{processes[p].title}](#{anchor('process', p)})" for p in s.processes) or "—"
        w(f"- **ISO 15288 processes:** {processes_links}")
        w(f"- **Concerns:** {names('concern', s.concerns)}")
        w("")

    # 3. Concerns
    w("## 3. Concerns")
    w("")
    w("Concerns of the package `ISO15288Processes::Concerns`. The subject of every concern is the SYSMOD `Project`.")
    w("")
    w("| Concern | Stakeholders | Viewpoints |")
    w("|---|---|---|")
    for c in concerns.values():
        w(f"| {link('concern', c.name)} | {names('stakeholder', c.stakeholders)} | {names('viewpoint', c.viewpoints)} |")
    w("")
    for c in concerns.values():
        w(f'<a id="{anchor("concern", c.name)}"></a>')
        w("")
        w(f"### {c.name}")
        w("")
        w(c.doc)
        w("")
        w(f"- **Stakeholders:** {names('stakeholder', c.stakeholders)}")
        w(f"- **Framed by viewpoints:** {names('viewpoint', c.viewpoints)}")
        w("")

    # 4. Viewpoints
    w("## 4. Viewpoints")
    w("")
    w("Viewpoints of the package `SYSMODViews::Viewpoints`. The stakeholders are the stakeholders of the framed concerns.")
    w("")
    w("| Viewpoint | Concerns | Stakeholders | Views |")
    w("|---|---|---|---|")
    for vp in viewpoints.values():
        w(f"| {link('viewpoint', vp.name)} | {names('concern', vp.concerns)} | "
          f"{names('stakeholder', viewpoint_stakeholders(vp, concerns))} | {names('view', vp.views)} |")
    w("")
    for vp in viewpoints.values():
        w(f'<a id="{anchor("viewpoint", vp.name)}"></a>')
        w("")
        w(f"### {vp.name}")
        w("")
        w(vp.doc)
        w("")
        w(f"- **Frames concerns:** {names('concern', vp.concerns)}")
        w(f"- **Stakeholders:** {names('stakeholder', viewpoint_stakeholders(vp, concerns))}")
        types = ", ".join(f"`{short(t)}`" for t in vp.element_types) or "—"
        w(f"- **Allowed exposed elements:** {types}")
        w(f"- **Views:** {names('view', vp.views)}")
        w("")

    # 5. Views
    w("## 5. Views")
    w("")
    w("View definitions of the SYSMODViews library with their backward traceability "
      "view → viewpoint → concern → stakeholder → ISO 15288 process, and examples.")
    w("")
    w("| View | SYSMOD steps | Viewpoints | Concerns | Stakeholders |")
    w("|---|---|---|---|---|")
    for v in views.values():
        vps = all_viewpoints(v, views)
        cs = unique(c for vp in vps for c in viewpoints[vp].concerns)
        ss = unique(s for c in cs for s in concerns[c].stakeholders)
        w(f"| {link('view', v.name)} | {step_names(v)} | {names('viewpoint', vps)} | "
          f"{names('concern', cs)} | {names('stakeholder', ss)} |")
    w("")
    for v in views.values():
        vps = all_viewpoints(v, views)
        cs = unique(c for vp in vps for c in viewpoints[vp].concerns)
        ss = unique(s for c in cs for s in concerns[c].stakeholders)
        ps = unique(p for s in ss for p in stakeholders[s].processes)
        w(f'<a id="{anchor("view", v.name)}"></a>')
        w("")
        w(f"### {v.name}{' (abstract)' if v.abstract else ''}")
        w("")
        w(v.doc or "_No documentation._")
        w("")
        general = link("view", v.general) if v.general in views else f"`{v.general}`" if v.general else "—"
        w(f"- **Specializes:** {general}")
        if v.specializations:
            w(f"- **Specialized by:** {names('view', v.specializations)}")
        w("")
        w("**Backward traceability**")
        w("")
        usages = ", ".join(f"`{step}` (`{usage}`)" for step, usage in v.steps) or "—"
        w(f"- **SYSMOD steps:** {usages}")
        w(f"- **Viewpoints:** {names('viewpoint', vps)}"
          + (" (inherited)" if vps and not v.own_viewpoints else ""))
        w(f"- **Concerns:** {names('concern', cs)}")
        w(f"- **Stakeholders:** {names('stakeholder', ss)}")
        w(f"- **ISO 15288 processes:** "
          + (", ".join(f"[{processes[p].title}](#{anchor('process', p)})" for p in ps) or "—"))
        w("")
        w("**Dependencies**")
        w("")
        if not v.artifacts:
            w("_Not tied to Project artifacts; the view shows whatever a project exposes, "
              + ("see its specializations._" if v.specializations else "e.g., a use case package._"))
            w("")
        else:
            inherited = " (inherited)" if not v.own_artifacts else ""
            w(f"- **Shows artifacts:** {code_list(v.artifacts)}{inherited}")
            w(f"- **Created by:** {code_list(creating_steps(v, artifacts))}")
            w(f"- **Builds on:** {view_artifact_list(v.builds_on)}")
            w(f"- **Information provided:** {code_list(v.external_inputs)}")
            w(f"- **Traces to:** {view_relation_list(v.traces_to)}")
            w(f"- **Input for:** {names('view', v.input_for)}")
            w("")
        w("**Definition**")
        w("")
        w("```sysml")
        w(v.source)
        w("```")
        w("")
        rendering_names, owner = inherited_renderings(v, views)
        for r in rendering_names:
            if r in renderings:
                doc, text = renderings[r]
                w(f"Rendering `{r}`" + (f" (inherited from {link('view', owner)})" if owner != v.name else "")
                  + (f": {doc}" if doc else ""))
                w("")
                w("```sysml")
                w(text)
                w("```")
                w("")
        w("**Example**")
        w("")
        if v.abstract:
            w(f"Abstract view definition; see the examples of {names('view', v.specializations)}.")
            w("")
        elif not v.examples:
            w("_No example yet._")
            w("")
        for path in v.examples:
            w(f"![{v.name} example]({relpath(path)})")
            w("")
            w(f"_Illustrative example based on the Delivery Drone example model ([{path.name}]({relpath(path)}))._")
            w("")

    # 6. View dependencies
    primary = [v for v in views.values() if v.own_artifacts and not v.abstract]
    w("## 6. View Dependencies")
    w("")
    w("The dependencies between the views are the correspondences of the SYSMOD architecture description framework "
      "in the sense of ISO/IEC/IEEE 42010. They are not maintained by hand but derived from the library:")
    w("")
    w("- Each view definition names the Project features, i.e., the artifacts, that a conforming view shows "
      "(`#viewedArtifact` dependencies in [SYSMODViews.sysml](SYSMODViews.sysml)).")
    w("- **Builds on:** the SYSMOD step that creates the artifacts of a view reads artifacts that earlier steps "
      "created (the inputs of the step or of its nested action in `SYSMOD::SYSMODProcesses`). "
      "The view builds on the views showing these artifacts.")
    w("- **Traces to:** the Project relates its artifacts by model relationships, e.g., the specification context "
      "specializes the system idea context, the system requirements frame the stakeholder needs, and the product "
      "system satisfies the system requirements (`SYSMOD::Project`).")
    w("- **Information provided:** step inputs that no step creates, e.g., the problem statement text or a "
      "description of the existing architecture, given by a human or an AI assistant. Views with such inputs and "
      "without a *builds on* dependency are entry points.")
    w("")
    w("A dependency states which content builds on which other content. It does not require the other view to be "
      "complete: SYSMOD lets you start with partial content, e.g., describe the system idea before all stakeholder "
      "needs are elaborated, and revise earlier content when later steps reveal gaps. Following the dependencies "
      "keeps the content consistent and traceable; the default order is given by the SYSMOD process steps, "
      "and changes ripple along the *input for* direction.")
    w("")
    w("```mermaid")
    w("flowchart TB")
    placed = set()
    for step in unique(step_order):
        members = [v for v in primary if creating_steps(v, artifacts)[:1] == [step]]
        if not members:
            continue
        w(f'    subgraph {step}["{humanize(step)}"]')
        for v in members:
            w(f"        {v.name}[{v.name}]")
            placed.add(v.name)
        w("    end")
    for v in primary:
        if v.name not in placed:
            w(f"    {v.name}[{v.name}]")
    drawn = set()
    for v in primary:
        for other in v.builds_on:
            w(f"    {other} --> {v.name}")
            drawn.add(frozenset((other, v.name)))
    for v in primary:
        for other in v.traces_to:
            if frozenset((other, v.name)) not in drawn:
                w(f"    {v.name} -.-> {other}")
                drawn.add(frozenset((other, v.name)))
    w("```")
    w("")
    w("_Solid arrow: the target view builds on the source view. Dotted arrow: the source view traces to the "
      "target view by a model relationship only. Grouped by the SYSMOD step creating the content; views that "
      "inherit their artifacts, e.g., the AI views, are not shown and have the dependencies of their general view._")
    w("")
    w("| View | Shows artifacts | Created by | Builds on | Information provided | Traces to | Input for |")
    w("|---|---|---|---|---|---|---|")
    for v in views.values():
        if not v.artifacts or v.abstract:
            continue
        w(f"| {link('view', v.name)} | {code_list(v.artifacts)} | {code_list(creating_steps(v, artifacts))} | "
          f"{names('view', list(v.builds_on))} | {code_list(v.external_inputs)} | {names('view', list(v.traces_to))} | "
          f"{names('view', v.input_for)} |")
    w("")
    others = [v.name for v in views.values() if not v.artifacts or v.abstract]
    w(f"Not tied to Project artifacts: {names('view', others)}. They are base views or show whatever a project "
      "exposes, e.g., a use case package. See the views for the artifacts behind each dependency.")
    w("")

    return "\n".join(out).rstrip() + "\n"


def code_list(items):
    """Inline code list; the artifact 'this' is the Project itself."""
    return ", ".join(f"`{'Project' if i == 'this' else i}`" for i in items) if items else "—"


def view_artifact_list(mapping):
    return ", ".join(f"{link('view', v)} ({code_list(a)})" for v, a in mapping.items()) if mapping else "—"


def view_relation_list(mapping):
    return ", ".join(f"{link('view', v)} ({'; '.join(r)})" for v, r in mapping.items()) if mapping else "—"


def unique(items):
    result = []
    for item in items:
        if item not in result:
            result.append(item)
    return result


def step_names(view):
    return ", ".join(f"`{s}`" for s in unique(step for step, _ in view.steps)) or "—"


def viewpoint_stakeholders(viewpoint, concerns):
    return unique(s for c in viewpoint.concerns for s in concerns[c].stakeholders)


def library_version(elements):
    for element in elements:
        match = re.search(r"Version (v[\d.]+)", element.doc)
        if match:
            return match.group(1)
    return "unknown version"


def generate():
    views_source, views_elements = parse(VIEWS_FILE)
    _, sysmod_elements = parse(SYSMOD_FILE)
    _, iso_elements = parse(ISO15288_FILE)
    library = find_package(views_elements, "SYSMODViews")
    iso = find_package(iso_elements, "ISO15288Processes")

    processes = read_processes(iso, sysmod_elements)
    stakeholders = read_stakeholders(find_package(iso.children, "Stakeholders"), processes)
    concerns = read_concerns(find_package(iso.children, "Concerns"), stakeholders)
    viewpoints = read_viewpoints(find_package(library.children, "Viewpoints"), concerns)
    views = read_views(library.children, views_source, viewpoints)
    renderings = read_renderings(library.children, views_source)

    read_step_views(sysmod_elements, sorted(EXAMPLES_DIR.glob("*.sysml")), views)
    find_examples(views)

    read_viewed_artifacts(library, views)
    artifacts, step_order = read_artifacts(sysmod_elements)
    for view in views.values():
        for name in view.artifacts:
            if lookup(artifacts, name) is None:
                warn(f"view {view.name}: artifact {name} is neither created by a SYSMOD step nor related to another artifact")
    link_view_dependencies(views, artifacts)

    return render(library_version(views_elements), processes, stakeholders, concerns, viewpoints, views, renderings,
                  artifacts, step_order)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit 1 if the generated file is out of date")
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE, help="output file (default: %(default)s)")
    args = parser.parse_args()

    markdown = generate()
    for message in WARNINGS:
        print(f"warning: {message}", file=sys.stderr)

    if args.check:
        current = args.output.read_text(encoding="utf-8") if args.output.exists() else ""
        if current != markdown:
            print(f"{args.output.name} is out of date. Run: python scripts/generate_views_doc.py", file=sys.stderr)
            return 1
        print(f"{args.output.name} is up to date.")
        return 0

    args.output.write_text(markdown, encoding="utf-8", newline="\n")
    print(f"Wrote {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
