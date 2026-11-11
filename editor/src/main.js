import { config } from "./config.js";
import { App } from "./app/App.js";

const app = new App(config);
app.start();
// Exposed for debugging in the browser console.
window.methodologyEditor = app;
