import "./styles.css";
import { WorkshopView } from "./views/workshop";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root was not found");

new WorkshopView(root).mount();
