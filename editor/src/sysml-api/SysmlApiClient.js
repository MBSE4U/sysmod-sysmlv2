// Minimal client of the Systems Modeling API (SysML v2 API), REST/HTTP binding.
//
// Prepared for a future version of the editor; not used by the user interface yet.
// Endpoints as served by the SysML v2 API pilot implementation (SysML-v2-API-Services):
//   GET  /projects
//   GET  /projects/{projectId}/branches
//   GET  /projects/{projectId}/commits
//   GET  /projects/{projectId}/commits/{commitId}/roots
//   GET  /projects/{projectId}/commits/{commitId}/elements
//   GET  /projects/{projectId}/commits/{commitId}/elements/{elementId}
//   GET  /projects/{projectId}/commits/{commitId}/elements/{elementId}/relationships
//   POST /projects/{projectId}/commits?branchId={branchId}
// Collections are paged; the next page is announced in the Link header (rel="next").

export class SysmlApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "SysmlApiError";
        this.status = status;
    }
}

export class SysmlApiClient {
    /**
     * @param {string} baseUrl e.g. "http://localhost:9000"
     * @param {{headers?: object, pageSize?: number, fetch?: function}} options
     */
    constructor(baseUrl, { headers = {}, pageSize = 100, fetch: fetchFn = globalThis.fetch.bind(globalThis) } = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
        this.headers = headers;
        this.pageSize = pageSize;
        this.fetch = fetchFn;
    }

    getProjects() { return this.getAll("/projects"); }
    getProject(projectId) { return this.get(`/projects/${projectId}`); }
    getBranches(projectId) { return this.getAll(`/projects/${projectId}/branches`); }
    getCommits(projectId) { return this.getAll(`/projects/${projectId}/commits`); }
    getRoots(projectId, commitId) { return this.getAll(`/projects/${projectId}/commits/${commitId}/roots`); }
    getElements(projectId, commitId) { return this.getAll(`/projects/${projectId}/commits/${commitId}/elements`); }
    getElement(projectId, commitId, elementId) { return this.get(`/projects/${projectId}/commits/${commitId}/elements/${elementId}`); }
    getRelationships(projectId, commitId, elementId, direction = "both") {
        return this.getAll(`/projects/${projectId}/commits/${commitId}/elements/${elementId}/relationships?direction=${direction}`);
    }

    /** The head commit of a branch: the branch's head reference. */
    async getHeadCommitId(projectId, branchId) {
        const branch = await this.get(`/projects/${projectId}/branches/${branchId}`);
        return branch.head ? branch.head["@id"] : null;
    }

    /**
     * Posts a commit with element changes.
     * @param {object[]} change DataVersion objects: { "@type": "DataVersion", identity: { "@id" }, payload: element | null }
     */
    postCommit(projectId, { change, previousCommitId = null, description = "" }, branchId = null) {
        const body = { "@type": "Commit", change, description };
        if (previousCommitId) body.previousCommit = { "@id": previousCommitId };
        const query = branchId ? `?branchId=${branchId}` : "";
        return this.send("POST", `/projects/${projectId}/commits${query}`, body);
    }

    async get(path) {
        return (await this.request("GET", path)).json();
    }

    /** Reads all pages of a collection. */
    async getAll(path) {
        const items = [];
        let url = this.url(path, { "page[size]": this.pageSize });
        while (url) {
            const response = await this.request("GET", url);
            items.push(...(await response.json()));
            url = nextLink(response.headers.get("Link"));
        }
        return items;
    }

    async send(method, path, body) {
        return (await this.request(method, path, body)).json();
    }

    async request(method, pathOrUrl, body) {
        const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : this.url(pathOrUrl);
        const response = await this.fetch(url, {
            method,
            headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...this.headers },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new SysmlApiError(`${method} ${url} failed with HTTP ${response.status}`, response.status);
        return response;
    }

    url(path, query = {}) {
        const url = new URL(this.baseUrl + path);
        for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
        return url.href;
    }
}

function nextLink(header) {
    if (!header) return null;
    for (const part of header.split(",")) {
        const match = /<([^>]+)>\s*;\s*rel="?next"?/.exec(part);
        if (match) return match[1];
    }
    return null;
}
