// Small modal form built on <dialog>. Answers the field values, or null if the user cancels.
//
// fields: { name, label, type: "text"|"textarea"|"number"|"select"|"checkboxes"|"radio", value, options: [{value, label}], hint, required,
//           showWhen: { field, values } }   (the field is shown only while the other field has one of the values)

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function fieldHtml(f) {
    const hint = f.hint ? `<small class="fd-hint">${escapeHtml(f.hint)}</small>` : "";
    const field = `data-field="${f.name}"`;
    if (f.type === "select") {
        return `<label class="fd-field" ${field}><span>${escapeHtml(f.label)}</span>
            <select name="${f.name}">${f.options.map(o => `<option value="${escapeHtml(o.value)}"${o.value === f.value ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>${hint}</label>`;
    }
    if (f.type === "checkboxes" || f.type === "radio") {
        const type = f.type === "radio" ? "radio" : "checkbox";
        const selected = new Set([].concat(f.value || []));
        return `<fieldset class="fd-field fd-choices" ${field}><legend>${escapeHtml(f.label)}</legend>
            <div class="fd-choice-list">${f.options.map(o => `<label class="fd-choice" title="${escapeHtml(o.label)}"><input type="${type}" name="${f.name}" value="${escapeHtml(o.value)}"${selected.has(o.value) ? " checked" : ""}> ${escapeHtml(o.label)}</label>`).join("")
            || `<span class="fd-hint">Nothing to choose from.</span>`}</div>${hint}</fieldset>`;
    }
    if (f.type === "textarea") {
        return `<label class="fd-field" ${field}><span>${escapeHtml(f.label)}</span>
            <textarea name="${f.name}" rows="${f.rows || 4}" spellcheck="true">${escapeHtml(f.value || "")}</textarea>${hint}</label>`;
    }
    return `<label class="fd-field" ${field}><span>${escapeHtml(f.label)}</span>
        <input type="${f.type === "number" ? "number" : "text"}" ${f.type === "number" ? 'min="1" step="1"' : ""} name="${f.name}" value="${escapeHtml(f.value || "")}" ${f.required ? "required" : ""} autocomplete="off" spellcheck="false">${hint}</label>`;
}

/**
 * @param {{title: string, fields: object[], submitLabel?: string, validate?: function(object): string|null}} spec
 * @returns {Promise<object|null>}
 */
export function formDialog({ title, fields, submitLabel = "Add", validate = () => null }) {
    return new Promise(resolve => {
        const dialog = document.createElement("dialog");
        dialog.className = "form-dialog";
        dialog.innerHTML = `
            <form method="dialog">
                <h2>${escapeHtml(title)}</h2>
                ${fields.map(fieldHtml).join("")}
                <p class="fd-error" role="alert" hidden></p>
                <div class="fd-buttons">
                    <button type="button" value="cancel" class="secondary">Cancel</button>
                    <button type="submit" value="ok">${escapeHtml(submitLabel)}</button>
                </div>
            </form>`;
        document.body.appendChild(dialog);
        const form = dialog.querySelector("form");
        const error = dialog.querySelector(".fd-error");

        const values = () => {
            const data = new FormData(form);
            const result = {};
            for (const f of fields) result[f.name] = f.type === "checkboxes" ? data.getAll(f.name) : (data.get(f.name) || "").toString().trim();
            return result;
        };
        const updateVisibility = () => {
            const current = values();
            for (const f of fields.filter(x => x.showWhen)) {
                dialog.querySelector(`[data-field="${f.name}"]`).hidden = !f.showWhen.values.includes(current[f.showWhen.field]);
            }
        };
        form.addEventListener("change", updateVisibility);
        updateVisibility();
        const close = result => {
            dialog.close();
            dialog.remove();
            resolve(result);
        };

        form.addEventListener("submit", e => {
            e.preventDefault();
            const result = values();
            const message = validate(result);
            if (message) {
                error.textContent = message;
                error.hidden = false;
                return;
            }
            close(result);
        });
        dialog.querySelector('[value="cancel"]').addEventListener("click", () => close(null));
        dialog.addEventListener("cancel", e => { e.preventDefault(); close(null); });
        dialog.showModal();
        const first = dialog.querySelector("input[type=text], select");
        if (first) { first.focus(); if (first.select) first.select(); }
    });
}

/** Shows paragraphs of information, optionally with an action button (e.g. "Retry"). */
export function infoDialog(title, paragraphs, { actionLabel = "", action = null } = {}) {
    const dialog = document.createElement("dialog");
    dialog.className = "form-dialog info-dialog";
    dialog.innerHTML = `<form method="dialog"><h2>${escapeHtml(title)}</h2>
        ${paragraphs.map(p => `<p class="fd-info">${escapeHtml(p)}</p>`).join("")}
        <div class="fd-buttons">${action ? `<button value="action">${escapeHtml(actionLabel)}</button>` : ""}
        <button value="close" class="${action ? "secondary" : ""}">Close</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => {
        if (dialog.returnValue === "action" && action) action();
        dialog.remove();
    });
    dialog.showModal();
}

export function confirmDialog(message, { confirmLabel = "OK", cancelLabel = "Cancel" } = {}) {
    return new Promise(resolve => {
        const dialog = document.createElement("dialog");
        dialog.className = "form-dialog";
        dialog.innerHTML = `<form method="dialog"><p>${escapeHtml(message)}</p>
            <div class="fd-buttons"><button value="cancel" class="secondary">${escapeHtml(cancelLabel)}</button>
            <button value="ok">${escapeHtml(confirmLabel)}</button></div></form>`;
        document.body.appendChild(dialog);
        dialog.addEventListener("close", () => { resolve(dialog.returnValue === "ok"); dialog.remove(); });
        dialog.showModal();
    });
}
