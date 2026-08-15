import "./styles.css";
import { PoetryAtlasApp } from "./views/app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root was not found");

new PoetryAtlasApp(root).mount();
