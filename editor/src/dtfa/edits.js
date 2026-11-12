// Edits of the behaviors of a methodology as an MBSE environment performs them.

import { ModelEditError, valueLines, stepDefinitionLines, redefinitionLines, stringLiteral, listValue } from "../workspace/TextModelEditor.js";

/**
 * Edits that change behaviors (methods, processes) as an environment performs them. A behavior declared in the
 * environment is changed in place. A behavior that the environment inherits (from the environment it specializes or
 * from a library methodology) is redefined in the environment, e.g. "part :>> companyMethodology { action :>> m { ... } }".
 * @param {{id: string, pairs?: [string, string|null][], lines?: string[], definition?: [string, string|null][]}[]} changes
 *        pairs: values of the behavior; definition: values of its step definition metadata; lines: further statements
 * @param {object} editor a model editor (TextModelEditor)
 * @returns {{edits: object[], ids: Map<string, string>}} ids: the id of each behavior in the environment
 */
export function behaviorEdits(model, editor, environment, changes) {
    const isLocal = id => id.startsWith(environment.id + "::");
    const tree = model.methodologyTree(environment.id);
    const byId = new Map(tree.map(n => [n.element.id, n]));
    const edits = [], ids = new Map(), groups = new Map();
    const definitionLines = (behavior, pairs) => {
        // A new step definition keeps the values of an inherited one.
        const inherited = [["goal", behavior.goal ? stringLiteral(behavior.goal) : null], ["viewpoints", listValue(behavior.viewpoints.map(stringLiteral))],
            ["automationSteps", listValue(behavior.automationSteps.map(stringLiteral))]];
        const merged = inherited.map(([f, v]) => { const own = pairs.find(([g]) => g === f); return own ? own : [f, v]; });
        return merged.some(([, v]) => v) ? stepDefinitionLines(merged) : [];
    };
    for (const change of changes) {
        const behavior = model.get(change.id);
        const pairs = change.pairs || [], extra = change.lines || [];
        if (isLocal(change.id)) {
            ids.set(change.id, change.id);
            if (pairs.length) edits.push(...editor.setValues(change.id, pairs));
            if (change.definition) {
                if (behavior.stepDefinitionId) edits.push(...editor.setValues(behavior.stepDefinitionId, change.definition));
                else {
                    const lines = definitionLines(behavior, change.definition);
                    if (lines.length) edits.push(...editor.addElement(change.id, lines));
                }
            }
            if (extra.length) edits.push(...editor.addElement(change.id, extra));
            continue;
        }
        // Inherited: find the nearest local ancestor in the methodology tree.
        let node = byId.get(change.id);
        if (!node) throw new ModelEditError(`${model.nameOf(change.id)} is not a behavior of the methodology of ${environment.name}.`);
        const path = [];
        while (node && !isLocal(node.element.id)) { path.unshift(node.element.name); node = node.parentId ? byId.get(node.parentId) : null; }
        let insertInto, wrap = null;
        if (node) insertInto = node.element.id;
        else if (environment.methodologyId && isLocal(environment.methodologyId)) insertInto = environment.methodologyId;
        else { insertInto = environment.id; wrap = environment.methodologyName || "methodology"; }
        const key = `${insertInto}|${wrap}`;
        if (!groups.has(key)) groups.set(key, { insertInto, wrap, root: { children: new Map(), lines: [] } });
        let target = groups.get(key).root;
        for (const name of path) {
            if (!target.children.has(name)) target.children.set(name, { children: new Map(), lines: [] });
            target = target.children.get(name);
        }
        target.lines.push(...valueLines(pairs), ...(change.definition ? definitionLines(behavior, change.definition) : []), ...extra);
        ids.set(change.id, [insertInto, ...(wrap ? [wrap] : []), ...path].join("::"));
    }
    const render = node => [...node.lines, ...[...node.children].flatMap(([name, child]) => redefinitionLines([name], render(child)))];
    for (const { insertInto, wrap, root } of groups.values()) {
        const lines = render(root);
        edits.push(...editor.addElement(insertInto, wrap ? redefinitionLines([wrap], lines, "part") : lines));
    }
    return { edits, ids };
}
