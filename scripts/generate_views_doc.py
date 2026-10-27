#!/usr/bin/env python3
"""Generate SYSMODViews.md from the SYSMODViews library.

The Markdown file is read-only: it is fully regenerated from the SysML v2 sources
each time the library changes. Do not edit it by hand.

Sources:
  SYSMODViews.sysml   stakeholders, concerns, viewpoints, views
  SYSMOD.sysml        ISO 15288 processes, SYSMOD process steps refining them
  examples/*.sysml    view usages of the #project occurrence defs, linking the SYSMOD steps to the views
  examples/views/     example SVG renderings; the first 'SYSMODViews::<ViewDef>' in a file names its view

Traceability:
  process    <- stakeholder   "(ISO/IEC/IEEE 15288 <process names> process[es])" in the stakeholder doc
  stakeholder <- concern      stakeholder features of the concern def
  concern    <- viewpoint     frame concern features of the viewpoint def
  viewpoint  <- view          satisfy requirement features of the view def (including inherited ones)

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


def humanize(name):
    words = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name).split()
    return " ".join(w.lower() if w in ("And", "Or") else w for w in words)


def link(kind, name):
    return f"[{name}](#{anchor(kind, name)})"


def anchor(kind, name):
    return f"{kind}-{name}".lower()


def read_processes(sysmod_elements):
    package = find_package(sysmod_elements, "ISO15288Processes")
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
    e.g., 'flow from specifyProblemStatement.problemStatement to project.problemStatement'.
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


def render(version, processes, stakeholders, concerns, viewpoints, views, renderings):
    out = []
    w = out.append

    w("<!--")
    w("  GENERATED FILE - DO NOT EDIT.")
    w("  Generated from SYSMODViews.sysml and SYSMOD.sysml by scripts/generate_views_doc.py.")
    w("  Edit the library and rerun the script instead.")
    w("-->")
    w("")
    w("# SYSMOD Views")
    w("")
    w(f"> This document is generated from the SYSMODViews library ({version}). It is read-only; "
      "changes are made in [SYSMODViews.sysml](SYSMODViews.sysml) and the document is regenerated "
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
    w("## Contents")
    w("")
    w("1. [ISO 15288 Processes](#1-iso-15288-processes)")
    w("2. [Stakeholders](#2-stakeholders)")
    w("3. [Concerns](#3-concerns)")
    w("4. [Viewpoints](#4-viewpoints)")
    w("5. [Views](#5-views)")
    w("")

    # 1. Processes
    w("## 1. ISO 15288 Processes")
    w("")
    w("The life cycle processes of ISO/IEC/IEEE 15288 as defined in the package `SYSMOD::ISO15288Processes`, "
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
    w("Stakeholders of the package `SYSMODViews::Stakeholders`. Each one specializes `ExtendedStakeholder`.")
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
    w("Concerns of the package `SYSMODViews::Concerns`. The subject of every concern is the SYSMOD `Project`.")
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

    return "\n".join(out).rstrip() + "\n"


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
    library = find_package(views_elements, "SYSMODViews")

    processes = read_processes(sysmod_elements)
    stakeholders = read_stakeholders(find_package(library.children, "Stakeholders"), processes)
    concerns = read_concerns(find_package(library.children, "Concerns"), stakeholders)
    viewpoints = read_viewpoints(find_package(library.children, "Viewpoints"), concerns)
    views = read_views(library.children, views_source, viewpoints)
    renderings = read_renderings(library.children, views_source)

    read_step_views(sysmod_elements, sorted(EXAMPLES_DIR.glob("*.sysml")), views)
    find_examples(views)

    return render(library_version(views_elements), processes, stakeholders, concerns, viewpoints, views, renderings)


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
